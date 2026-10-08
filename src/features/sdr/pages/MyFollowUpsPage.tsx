'use client';
import { useLeads, useCompleteFollowUp, useCreateCall, useUpdateCall, useScheduleFollowUp } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { CallNotesModal } from '@/features/calls/components/CallNotesModal';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const getDefaultFollowUpDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export default function MyFollowUpsPage() {
  const { data: allLeads = [], isLoading } = useLeads();
  const { user } = useAuth();
  const completeFollowUp = useCompleteFollowUp();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const scheduleFollowUp = useScheduleFollowUp();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [callNotesState, setCallNotesState] = useState<{ open: boolean; leadId: string; leadName: string; callId: string }>({ open: false, leadId: '', leadName: '', callId: '' });
  const [followUpState, setFollowUpState] = useState<{ open: boolean; leadId: string; leadName: string; date: string }>({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() });

  // Only this SDR's leads
  const leads = allLeads.filter((l: { assignedAgent?: string }) => !l.assignedAgent || l.assignedAgent === user?.name);

  const handleMarkDone = async (leadId: string, leadName: string) => {
    try {
      await completeFollowUp.mutateAsync(leadId);
      toast.success(`Follow-up with ${leadName} marked as done`);
    } catch {
      toast.error('Failed to mark follow-up as done');
    }
  };

  const handleCallNow = async (lead: { id: string; name: string; workDirectPhone?: string; mobilePhone?: string; phone?: string }) => {
    try {
      // Log the call first so we always have a record
      const result = await createCall.mutateAsync({
        leadId: lead.id,
        leadName: lead.name,
        agentName: user?.name || 'Unknown',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: '0 min',
        status: 'Completed',
        notes: 'Call initiated from follow-ups',
      });

      const callId = result?.id || result?._id || '';

      // Open phone dialer
      const phone = lead.workDirectPhone || lead.mobilePhone || lead.phone || '';
      if (phone) {
        window.open(`tel:${phone.replace(/[^+\d]/g, '')}`, '_self');
      }

      toast.success(`Call to ${lead.name} logged`);

      // Open call notes modal so user can add details
      if (callId) {
        setCallNotesState({ open: true, leadId: lead.id, leadName: lead.name, callId });
      }
    } catch {
      toast.error('Failed to log call');
    }
  };

  const handleSaveCallNotes = async (notes: string, duration: number, followUpDate?: string) => {
    if (!callNotesState.callId) return;
    try {
      await updateCall.mutateAsync({ id: callNotesState.callId, data: { notes, duration: duration * 60 } });
      if (followUpDate && callNotesState.leadId) {
        await scheduleFollowUp.mutateAsync({ leadId: callNotesState.leadId, date: followUpDate });
        toast.success('Call notes & follow-up saved');
      } else {
        toast.success('Call notes saved');
        // If no date chosen in modal, open the separate reschedule dialog
        const { leadId, leadName } = callNotesState;
        setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' });
        setFollowUpState({ open: true, leadId, leadName, date: getDefaultFollowUpDate() });
        return;
      }
      setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' });
    } catch {
      toast.error('Failed to save call notes');
      setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' });
    }
  };

  const handleCloseCallNotes = () => {
    setCallNotesState({ open: false, leadId: '', leadName: '', callId: '' });
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpState.leadId || !followUpState.date) return;
    try {
      await scheduleFollowUp.mutateAsync({ leadId: followUpState.leadId, date: followUpState.date });
      toast.success(`Follow-up rescheduled for ${followUpState.leadName}`);
      setFollowUpState({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() });
    } catch {
      toast.error('Failed to schedule follow-up');
    }
  };

  const myFollowUps = leads
    .filter((l: { nextFollowUp?: string | null; status?: string }) => l.nextFollowUp && l.status !== 'Closed Won' && l.status !== 'Closed Lost')
    .map(l => ({
      ...l,
      isOverdue: new Date(l.nextFollowUp!) < today,
      daysUntil: Math.ceil((new Date(l.nextFollowUp!).getTime() - today.getTime()) / 86400000),
    }))
    .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime());

  const filtered = myFollowUps.filter(f => {
    if (filter === 'overdue') return f.isOverdue;
    if (filter === 'upcoming') return !f.isOverdue;
    return true;
  });

  const overdueCount = myFollowUps.filter(f => f.isOverdue).length;
  const upcomingCount = myFollowUps.filter(f => !f.isOverdue).length;
  const activeFilterLabel = filter === 'all' ? 'All' : filter === 'overdue' ? 'Overdue' : 'Upcoming';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <DashboardTableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Follow-ups</h1>
        <p className="text-sm text-muted-foreground mt-1">{myFollowUps.length} follow-ups pending</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Results: {filtered.length}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Overdue: {overdueCount}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Upcoming: {upcomingCount}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Filter: {activeFilterLabel}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold text-foreground">{myFollowUps.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
          <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <CheckCircle className="h-5 w-5 mx-auto mb-2 text-success" />
          <p className="text-2xl font-bold text-success">{upcomingCount}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          All ({myFollowUps.length})
        </Button>
        <Button variant={filter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('overdue')}>
          Overdue ({overdueCount})
        </Button>
        <Button variant={filter === 'upcoming' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('upcoming')}>
          Upcoming ({upcomingCount})
        </Button>
      </div>

      {/* Follow-up list */}
      <div className="space-y-3">
        {filtered.map(lead => (
          <div key={lead.id} className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${lead.isOverdue ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                <div>
                  <Link href={`/sdr/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">{lead.name}</Link>
                  <p className="text-xs text-muted-foreground">
                    {lead.phone ? (
                      <button onClick={() => handleCallNow(lead)} className="text-primary hover:underline">{lead.phone}</button>
                    ) : 'No phone'}
                    {' · '}{lead.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-medium ${lead.isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                    {lead.nextFollowUp}
                  </p>
                  <p className={`text-xs ${lead.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {lead.isOverdue
                      ? `${Math.abs(lead.daysUntil)} day${Math.abs(lead.daysUntil) !== 1 ? 's' : ''} overdue`
                      : lead.daysUntil === 0
                        ? 'Due today'
                        : `In ${lead.daysUntil} day${lead.daysUntil !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <Badge variant={lead.isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                  {lead.status}
                </Badge>
              </div>
            </div>
            {lead.notes && (
              <p className="mt-2 text-xs text-muted-foreground ml-6">{lead.notes}</p>
            )}
            <div className="mt-3 ml-6 flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleCallNow(lead)}>
                <Phone className="h-3 w-3" />
                Call Now
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleMarkDone(lead.id, lead.name)}
                disabled={completeFollowUp.isPending}>
                <CheckCircle className="h-3 w-3" />
                Mark Done
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-sm text-muted-foreground">No follow-ups in this view. Nice work!</p>
          </div>
        )}
      </div>

      {/* Call Notes Modal — appears after calling from follow-ups */}
      <CallNotesModal
        open={callNotesState.open}
        leadName={callNotesState.leadName}
        onSave={handleSaveCallNotes}
        onClose={handleCloseCallNotes}
      />

      {/* Schedule Follow-up Dialog — appears after saving call notes */}
      <Dialog open={followUpState.open} onOpenChange={(open) => !open && setFollowUpState({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up</DialogTitle>
            <DialogDescription>
              Set the next follow-up date for {followUpState.leadName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="block text-sm font-medium text-foreground">
              Follow-up date
              <input
                type="date"
                min={todayStr}
                value={followUpState.date}
                onChange={(e) => setFollowUpState((current) => ({ ...current, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpState({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() })}>
              Skip
            </Button>
            <Button onClick={handleScheduleFollowUp} disabled={scheduleFollowUp.isPending || !followUpState.date}>
              {scheduleFollowUp.isPending ? 'Saving...' : 'Save Follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
