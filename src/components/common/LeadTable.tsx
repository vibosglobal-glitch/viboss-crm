'use client';

import { useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Edit, CheckCircle, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Lead } from '@/features/leads/types/leads';
import { useCompleteFollowUp, useCreateCall, useScheduleFollowUp, useUpdateCall } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { toast } from 'sonner';
import { getPriorityBadgeClass, getStageBadgeClass } from '@/features/leads/constants/pipeline';
import { ContactPickerModal } from '@/components/common/ContactPickerModal';
import { CallNotesModal } from '@/features/calls/components/CallNotesModal';

function toTelUri(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

const formatCompanySize = (count?: string | number | null) => {
  if (count === undefined || count === null) {
    return '—';
  }
  if (typeof count === 'number') {
    return count.toLocaleString();
  }
  // String — could be '250' or '11-50' or 'Small (1-10)'
  const trimmed = String(count).trim();
  return trimmed || '—';
};

const SOURCE_LABELS: Record<string, string> = {
  csv_upload: 'CSV Import',
  manual: 'Manual',
  website: 'Website',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  other: 'Other',
};

type QuickCallOption = {
  label: string;
  note: string;
  outcome: string;
  status: 'Completed' | 'Missed' | 'Follow-up';
  requiresFollowUp?: boolean;
};

const QUICK_CALL_OPTIONS = [
  { label: 'Left VM', note: 'Left VM', outcome: 'voicemail', status: 'Missed' },
  { label: 'Not Interested', note: 'Not Interested', outcome: 'not_interested', status: 'Completed' },
  { label: 'OOO', note: 'OOO', outcome: 'callback_requested', status: 'Follow-up', requiresFollowUp: true },
  { label: 'Call back in a while', note: 'Call back in a while', outcome: 'callback_requested', status: 'Follow-up', requiresFollowUp: true },
  { label: 'Wrong Number', note: 'Wrong Number', outcome: 'wrong_number', status: 'Missed' },
  { label: 'Call Booked', note: 'Call Booked', outcome: 'callback_requested', status: 'Follow-up', requiresFollowUp: true },
] satisfies readonly QuickCallOption[];

const getDefaultFollowUpDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export default function LeadTable({
  leads,
  compact = false,
  startIndex = 0,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onDelete
}: {
  leads: Lead[];
  compact?: boolean;
  startIndex?: number;
  selectedIds?: string[];
  onSelect?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onDelete?: (id: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/sdr') ? '/sdr' : '/admin';

  const completeFollowUp = useCompleteFollowUp();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const scheduleFollowUp = useScheduleFollowUp();
  const { user } = useAuth();
  const totalColumns = (onSelect ? 1 : 0) + 11 + (compact ? 0 : 1);
  const [contactPickerLead, setContactPickerLead] = useState<Lead | null>(null);
  const [callNotesState, setCallNotesState] = useState<{ open: boolean; leadId: string; leadName: string; callId: string; initialNote: string }>({ open: false, leadId: '', leadName: '', callId: '', initialNote: '' });
  const [pendingFollowUp, setPendingFollowUp] = useState<{ leadId: string; leadName: string; callId: string } | null>(null);
  const [followUpState, setFollowUpState] = useState<{ open: boolean; leadId: string; leadName: string; date: string }>({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() });

  const openFollowUpDialog = (leadId: string, leadName: string) => {
    setFollowUpState({ open: true, leadId, leadName, date: getDefaultFollowUpDate() });
  };

  const handleLogCall = async (lead: Lead, option: QuickCallOption) => {
    try {
      const now = new Date();
      const result = await createCall.mutateAsync({
        leadId: lead.id,
        leadName: lead.name,
        agentName: user?.name || 'Unknown Agent',
        date: now.toISOString(),
        time: now.toTimeString().slice(0, 5),
        duration: '0 min',
        status: option.status,
        outcome: option.outcome,
        notes: option.note,
      });
      toast.success(`Call logged for ${lead.name}`);
      const callId = result?.id || result?._id || '';
      if (callId) {
        setCallNotesState({ open: true, leadId: lead.id, leadName: lead.name, callId, initialNote: option.note });
        if (option.requiresFollowUp) {
          setPendingFollowUp({ leadId: lead.id, leadName: lead.name, callId });
        }
      } else if (option.requiresFollowUp) {
        openFollowUpDialog(lead.id, lead.name);
      }
    } catch {
      toast.error('Failed to log call');
    }
  };

  const openPendingFollowUpIfNeeded = () => {
    if (!pendingFollowUp) {
      return;
    }

    openFollowUpDialog(pendingFollowUp.leadId, pendingFollowUp.leadName);
    setPendingFollowUp(null);
  };

  const handleSaveCallNotes = async (notes: string, duration: number, followUpDate?: string) => {
    if (!callNotesState.callId) return;

    const combinedNotes = [callNotesState.initialNote, notes.trim()].filter(Boolean).join(notes.trim() ? ': ' : '');

    try {
      await updateCall.mutateAsync({ id: callNotesState.callId, data: { notes: combinedNotes, duration: duration * 60 } });
      // Schedule follow-up if user chose one inside the modal
      if (followUpDate && callNotesState.leadId) {
        await scheduleFollowUp.mutateAsync({ leadId: callNotesState.leadId, date: followUpDate });
      }
      toast.success('Call notes saved');
      setCallNotesState({ open: false, leadId: '', leadName: '', callId: '', initialNote: '' });
      // Only open the separate follow-up dialog if needed and user didn't already pick a date
      if (!followUpDate) {
        openPendingFollowUpIfNeeded();
      } else {
        setPendingFollowUp(null);
      }
    } catch {
      toast.error('Failed to save call notes');
    }
  };

  const handleCloseCallNotes = () => {
    setCallNotesState({ open: false, leadId: '', leadName: '', callId: '', initialNote: '' });
    setPendingFollowUp(null);
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpState.leadId || !followUpState.date) {
      return;
    }

    try {
      await scheduleFollowUp.mutateAsync({ leadId: followUpState.leadId, date: followUpState.date });
      toast.success(`Follow-up scheduled for ${followUpState.leadName}`);
      setFollowUpState({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() });
    } catch {
      toast.error('Failed to schedule follow-up');
    }
  };

  const handleComplete = async (lead: Lead) => {
    if (!lead.nextFollowUp) {
      return;
    }

    try {
      await completeFollowUp.mutateAsync(lead.id);
      toast.success(`Follow-up with ${lead.name} completed`);
    } catch {
      toast.error('Failed to complete follow-up');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-gradient-to-r from-secondary/60 to-secondary/30">
              {onSelect && (
                <th className="text-center px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && leads.every(lead => selectedIds.includes(lead.id || lead._id || ''))}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
              )}
              <th className="text-center px-3 py-3 font-medium text-muted-foreground w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agency Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Company Size</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Uploaded By</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Lead Owner</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Source</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Status</th>
              {!compact && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No leads found for the selected filters.
                </td>
              </tr>
            ) : leads.map((lead, index) => {
              const isOverdue = !!(lead.nextFollowUp && lead.nextFollowUp < today && lead.status !== 'Active Account');
              const companySize = lead.employeeCount;
              const leadId = lead.id || lead._id || `${lead.email}-${index}`;

              return (
                <tr
                  key={leadId}
                  className={`border-b border-border/40 transition-all duration-200 hover:bg-primary/[0.03] ${isOverdue ? 'bg-destructive/5' : index % 2 === 1 ? 'bg-secondary/20' : ''}`}
                >
                  {onSelect && (
                    <td className="text-center px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(leadId)}
                        onChange={(e) => onSelect(leadId, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="text-center px-3 py-3 text-muted-foreground text-xs font-medium">{startIndex + index + 1}</td>

                  <td className="px-4 py-3">
                    <Link href={`${basePath}/leads/${leadId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {lead.companyName || '—'}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <Link href={`${basePath}/leads/${leadId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {lead.name || '—'}
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatCompanySize(companySize)}</td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getPriorityBadgeClass(lead.priority)}`}>
                      {lead.priority || 'C'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.uploader?.name || lead.addedBy || '—'}</td>

                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.assignedAgent || '—'}</td>

                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {lead.city || lead.state ? `${lead.city || ''}${lead.city && lead.state ? ', ' : ''}${lead.state || ''}` : '—'}
                  </td>

                  <td className="px-4 py-3 hidden xl:table-cell">
                    {lead.source ? (
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStageBadgeClass(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>

                  {!compact && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.phone && (
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-r-none"
                              title="Call Now"
                              onClick={() => setContactPickerLead(lead)}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-5 text-primary hover:bg-primary/10 rounded-l-none border-l border-primary/20" title="Quick Log Call">
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {QUICK_CALL_OPTIONS.map((option) => (
                                  <DropdownMenuItem key={option.label} onClick={() => handleLogCall(lead, option)} className="cursor-pointer">
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                          title="View Details"
                          onClick={() => router.push(`${basePath}/leads/${leadId}`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:bg-success/10"
                          title="Complete Follow-up"
                          onClick={() => handleComplete(lead)}
                          disabled={!lead.nextFollowUp}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>

                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete Lead"
                            onClick={() => onDelete(leadId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {contactPickerLead && (
        <ContactPickerModal
          lead={contactPickerLead}
          open={!!contactPickerLead}
          onClose={() => setContactPickerLead(null)}
          onCall={(phone) => {
            handleLogCall(contactPickerLead, {
              label: 'Called',
              note: `Called ${phone}`,
              outcome: 'connected',
              status: 'Completed',
            });
          }}
        />
      )}

      <CallNotesModal
        open={callNotesState.open}
        leadName={callNotesState.leadName}
        onSave={handleSaveCallNotes}
        onClose={handleCloseCallNotes}
      />

      <Dialog open={followUpState.open} onOpenChange={(open) => !open && setFollowUpState({ open: false, leadId: '', leadName: '', date: getDefaultFollowUpDate() })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Save the next follow-up date for {followUpState.leadName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="block text-sm font-medium text-foreground">
              Follow-up date
              <input
                type="date"
                min={today}
                value={followUpState.date}
                onChange={(event) => setFollowUpState((current) => ({ ...current, date: event.target.value }))}
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