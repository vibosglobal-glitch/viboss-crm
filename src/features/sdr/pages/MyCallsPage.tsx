'use client';
import { useCalls, useUpdateCall } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Phone, PlayCircle, Search, Loader2, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function MyCallsPage() {
  const { user } = useAuth();
  const { data: allCalls = [], isLoading } = useCalls();
  const updateCall = useUpdateCall();
  const calls = allCalls.filter((c: any) => c.userId === user?.id || c.agentName === user?.name);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', duration: '' });

  const filtered = calls.filter((c: any) => {
    const matchSearch = !search
      || c.leadName?.toLowerCase().includes(search.toLowerCase())
      || c.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success/10 text-success border-success/20';
      case 'Missed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Follow-up': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-secondary text-foreground';
    }
  };

  const getInitials = (name: string) =>
    (name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const AVATAR_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
  ];
  const getAvatarColor = (name: string) =>
    AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];

  const handleEditClick = (call: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCall(call);
    setEditForm({ status: call.status, notes: call.notes || '', duration: call.duration || '' });
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
    } catch (error) {
      toast.error('Failed to update call');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-36" />
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
    <div className="space-y-5 md:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Calls</h1>
        <p className="text-sm text-muted-foreground mt-1">{calls.length} calls total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Results: {filtered.length}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Status: {statusFilter === 'all' ? 'All' : statusFilter}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search calls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Completed', 'Missed', 'Follow-up'].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
      </div>

      {/* Calls list */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Notes</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No calls found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((call, idx) => (
                  <tr
                    key={call.id}
                    className="border-b border-border hover:bg-secondary/20 transition-all duration-200"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {/* Lead with avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold shadow ring-2 ring-white/80 transition-transform hover:scale-110 ${getAvatarColor(call.leadName)}`}>
                          {getInitials(call.leadName)}
                        </div>
                        <div>
                          {call.leadId ? (
                            <Link
                              href={`/sdr/leads/${call.leadId}`}
                              className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                            >
                              {call.leadName}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{call.leadName}</span>
                          )}
                          <p className="text-xs text-muted-foreground">{call.agentName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{call.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{call.time}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{call.duration}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${statusColor(call.status)}`}>
                        {call.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{call.notes}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {call.hasRecording && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10">
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={(e) => handleEditClick(call, e)}
                          title="Edit call"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Call Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Call</DialogTitle>
            <DialogDescription>
              Update call details for <strong>{selectedCall?.leadName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Missed">Missed</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                placeholder="e.g. 5:30"
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add call notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateCall.isPending}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateCall.isPending} className="gradient-primary border-0">
              {updateCall.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
