'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Phone, Play, Download, Search, ChevronLeft, ChevronRight, Loader2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalls, useUpdateCall } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  'Completed': 'bg-success/10 text-success border-success/20',
  'Missed': 'bg-destructive/10 text-destructive border-destructive/20',
  'Follow-up': 'bg-warning/10 text-warning border-warning/20',
};

const PAGE_SIZE = 8;

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
];
const getInitials = (name: string) =>
  (name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];

export default function CallsPage() {
  const { data: calls = [], isLoading } = useCalls();
  const updateCall = useUpdateCall();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', duration: '' });

  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/sdr') ? '/sdr' : '/admin';

  const filtered = calls.filter((c: any) => {
    const matchSearch = !debouncedSearch || c.leadName.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.agentName.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEditClick = (call: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCall(call);
    setEditForm({ status: call.status, notes: call.notes, duration: call.duration });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCall) return;
    try {
      await updateCall.mutateAsync({
        id: selectedCall.id,
        data: editForm
      });
      toast.success('Call updated successfully');
      setEditDialogOpen(false);
      setSelectedCall(null);
      if (editForm.status === 'Follow-up') {
        router.push(`${basePath}/follow-ups`);
      }
    } catch (error) {
      toast.error('Failed to update call');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-72" />
        </div>
        <DashboardTableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Call History</h1>
        <p className="text-sm text-muted-foreground mt-1">{calls.length} total calls</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Results: {filtered.length}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Status: {statusFilter === 'all' ? 'All' : statusFilter}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by lead or agent name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Completed', 'Missed', 'Follow-up'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-secondary/60">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Notes</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No calls found for the current filters.
                  </td>
                </tr>
              ) : paginated.map(call => (
                <tr key={call.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ring-2 ring-white/80 transition-transform hover:scale-110 ${getAvatarColor(call.leadName)}`}>
                        {getInitials(call.leadName)}
                      </div>
                      <div>
                        {call.leadId ? (
                          <Link
                            href={`${basePath}/leads/${call.leadId}`}
                            className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                          >
                            {call.leadName}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">{call.leadName}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{call.agentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{call.date}</div>
                    <div className="text-xs">{call.time}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{call.duration}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[call.status]}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{call.notes}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {call.hasRecording && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-secondary">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                        onClick={(e) => handleEditClick(call, e)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Call Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Call</DialogTitle>
            <DialogDescription>
              Update call details for {selectedCall?.leadName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Missed">Missed</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 5:30"
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add call notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateCall.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCall.isPending}>
              {updateCall.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
