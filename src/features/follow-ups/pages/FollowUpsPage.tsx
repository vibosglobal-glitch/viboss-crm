'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { usePaginatedLeads, useCompleteFollowUp, useCreateCall, useUpdateCall, useScheduleFollowUp } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { CallNotesModal } from '@/features/calls/components/CallNotesModal';
import { toast } from 'sonner';

/** Normalize a nextFollowUp value (full ISO datetime or date-only) to YYYY-MM-DD */
function toDateStr(value: string | null | undefined): string {
  if (!value) return '';
  return value.split('T')[0];
}

export default function FollowUpsPage() {
  const { data, isLoading, isError } = usePaginatedLeads({
    hasFollowUp: true,
    sortBy: 'nextFollowUp',
    sortOrder: 'asc',
    limit: 500,
  });
  const leads = data?.leads ?? [];
  const today = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const completeFollowUp = useCompleteFollowUp();
  const createCall = useCreateCall();
  const updateCallMutation = useUpdateCall();
  const scheduleFollowUp = useScheduleFollowUp();
  const { user } = useAuth();
  const router = useRouter();
  const [callNotesState, setCallNotesState] = useState<{ open: boolean; leadId: string; leadName: string; callId: string }>({ open: false, leadId: '', leadName: '', callId: '' });

  const filtered = leads.filter(l => {
    const d = toDateStr(l.nextFollowUp);
    if (filter === 'overdue') return d < today;
    if (filter === 'today') return d === today;
    if (filter === 'upcoming') return d > today;
    return true;
  });

  const overdueCount = leads.filter(l => toDateStr(l.nextFollowUp) < today).length;
  const activeFilterLabel = filter === 'all' ? 'All' : filter === 'overdue' ? 'Overdue' : filter === 'today' ? 'Today' : 'Upcoming';

  const handleComplete = async (leadId: string, leadName: string) => {
    try {
      await completeFollowUp.mutateAsync(leadId);
      toast.success(`Follow-up with ${leadName} completed`);
    } catch {
      toast.error('Failed to complete follow-up');
    }
  };

  const handleCallNow = async (lead: any) => {
    try {
      const result = await createCall.mutateAsync({
        leadId: lead.id || lead._id,
        leadName: lead.name,
        agentName: user?.name || 'Unknown',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: '0 min',
        status: 'Completed',
        notes: 'Call initiated from follow-ups',
      });
      const callId = result?.id || result?._id || '';
      const phone = lead.workDirectPhone || lead.mobilePhone || lead.phone || '';
      if (phone) {
        window.open(`tel:${phone.replace(/[^+\d]/g, '')}`, '_self');
      }
      toast.success(`Call to ${lead.name} logged`);
      if (callId) {
        setCallNotesState({ open: true, leadId: lead.id || lead._id, leadName: lead.name, callId });
      }
    } catch {
      toast.error('Failed to log call');
    }
  };

  const handleSaveCallNotes = async (notes: string, duration: number, followUpDate?: string) => {
    if (!callNotesState.callId) return;
    try {
      await updateCallMutation.mutateAsync({ id: callNotesState.callId, data: { notes, duration: duration * 60 } });
      if (followUpDate && callNotesState.leadId) {
        await scheduleFollowUp.mutateAsync({ leadId: callNotesState.leadId, date: followUpDate });
        toast.success('Call notes & follow-up saved');
      } else {
        toast.success('Call notes saved');
      }
    } catch {
      toast.error('Failed to save call notes');
    } finally {
      setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' });
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-semibold text-foreground">Failed to load follow-ups</p>
        <p className="text-sm text-muted-foreground mt-1">Check your connection or try refreshing the page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
        <DashboardTableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Follow-up Pending</h1>
        <p className="text-sm text-muted-foreground mt-1">{leads.length} follow-ups • {overdueCount} overdue</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Results: {filtered.length}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Overdue: {overdueCount}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Filter: {activeFilterLabel}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'overdue', 'today', 'upcoming'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}
            className={filter === f && f === 'overdue' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
            {f === 'overdue' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'overdue' && overdueCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">{overdueCount}</Badge>}
          </Button>
        ))}
      </div>

      {/* Follow-up cards */}
      <div className="space-y-3">
        {filtered.map(lead => {
          const d = toDateStr(lead.nextFollowUp);
          const isOverdue = d < today;
          const isToday = d === today;
          return (
            <div key={lead.id || lead._id} className={`rounded-xl border bg-card p-4 shadow-card flex items-center justify-between gap-4 ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'}`}>
                  {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <Link href={`/admin/leads/${lead.id || lead._id}`} className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
                    {lead.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{lead.assignedAgent} • {lead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : isToday ? 'text-primary' : 'text-foreground'}`}>
                    {isOverdue ? 'OVERDUE' : isToday ? 'TODAY' : new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {(isOverdue || isToday) && (
                    <p className="text-xs text-muted-foreground">{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  )}
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => handleCallNow(lead)}
                  disabled={createCall.isPending}>
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  Call Now
                </Button>
                <Button size="sm" variant={isOverdue ? 'destructive' : 'default'}
                  onClick={() => handleComplete(lead.id || lead._id!, lead.name)}
                  disabled={completeFollowUp.isPending}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  {completeFollowUp.isPending ? 'Completing...' : 'Complete'}
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No follow-ups in this category</p>
          </div>
        )}
      </div>
    </div>

      {/* Call Notes Modal */}
      <CallNotesModal
        open={callNotesState.open}
        leadName={callNotesState.leadName}
        onSave={handleSaveCallNotes}
        onClose={() => setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' })}
      />
    </>
  );
}
