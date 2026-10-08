'use client';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, User, Calendar, FileText, RefreshCw, Loader2, Building2, MapPin, Globe, Linkedin, Users, CheckCircle, PhoneCall, Send, ShieldCheck, AlertTriangle, Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLead, useCalls, useCompleteFollowUp, useUpdateLead, useCreateCall, useUpdateCall, useMeetings, useCreateMeeting, useUpdateMeeting, useAgents, useScheduleFollowUp } from '@/hooks/useApi';
import { useLeadActivities, useCreateActivity } from '@/features/activities/hooks/useActivities';
import { usePipelineStages, useUpdateLeadStage } from '@/features/pipeline/hooks/usePipeline';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LeadStatus, Employee } from '@/features/leads/types/leads';
import { getStageBadgeClass, PIPELINE_STAGES, PRIORITIES, getPriorityBadgeClass, SEGMENTS, SOURCE_CHANNELS, checkQualityGate } from '@/features/leads/constants/pipeline';
import { CADENCE_TEMPLATES, TOUCH_TYPE_CONFIG, getCadenceTasks } from '@/features/leads/constants/cadences';
import { toast } from 'sonner';
import { useEffect, useState, useMemo } from 'react';
import { MeetingBookedModal, MeetingBookedData } from '@/features/meetings/components/MeetingBookedModal';
import { MeetingCompletedModal } from '@/features/meetings/components/MeetingCompletedModal';
import { EmployeeForm } from '@/features/leads/components/EmployeeForm';
import { ActiveAccountModal, ActiveAccountData } from '@/features/leads/components/ActiveAccountModal';
import { ContactPickerModal } from '@/components/common/ContactPickerModal';
import { CallNotesModal } from '@/features/calls/components/CallNotesModal';

/** Strips non-digit chars (keeps leading +) for tel: URI */
function toTelUri(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

function normalizeStatus(status?: string): string {
  return (status ?? '').trim().toLowerCase();
}

const STAGE_ORDER = new Map(PIPELINE_STAGES.map((stage, index) => [stage.key, index + 1]));

const activityIcons: Record<string, any> = {
  'call': Phone,
  'follow-up': Calendar,
  'note': FileText,
  'status-change': RefreshCw,
  'status_change': RefreshCw,
  'stage-change': RefreshCw,
  'assignment': User,
  'meeting': Calendar,
  'upload': Plus,
  'email': Send,
  'linkedin': Linkedin,
  'cadence-touch': CheckCircle,
};

const activityColors: Record<string, string> = {
  'call': 'bg-success/10 text-success',
  'follow-up': 'bg-warning/10 text-warning',
  'note': 'bg-muted text-muted-foreground',
  'status-change': 'bg-primary/10 text-primary',
  'status_change': 'bg-primary/10 text-primary',
  'stage-change': 'bg-primary/10 text-primary',
  'assignment': 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'meeting': 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'upload': 'bg-secondary text-foreground',
  'email': 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'linkedin': 'bg-sky-100/50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  'cadence-touch': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params?.leadId as string | undefined;
  const { data: lead, isLoading } = useLead(leadId ?? '');
  const { data: activities = [] } = useLeadActivities(leadId ?? '');
  const createActivity = useCreateActivity();
  const { data: stages = [] } = usePipelineStages();
  const updateStage = useUpdateLeadStage();
  const { data: allCalls = [] } = useCalls();
  const completeFollowUp = useCompleteFollowUp();
  const updateLead = useUpdateLead();
  const createCall = useCreateCall();
  const updateCallMutation = useUpdateCall();
  const scheduleFollowUpMutation = useScheduleFollowUp();
  const { user } = useAuth();
  const { data: meetings = [] } = useMeetings();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const { data: agents = [] } = useAgents();
  const sdrs = useMemo(() => agents.filter((a: any) => a.role === 'sdr'), [agents]);
  const selectableStages = useMemo(() => {
    const stageMap = new Map(stages.map((stage: any) => [stage.name, stage]));
    return PIPELINE_STAGES
      .map((stage) => stageMap.get(stage.key))
      .filter(Boolean);
  }, [stages]);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextStepPrompt, setNextStepPrompt] = useState<{ status: LeadStatus } | null>(null);
  const [nextStepDate, setNextStepDate] = useState('');
  const [nextStepNote, setNextStepNote] = useState('');
  const [activeTab, setActiveTab] = useState<'team' | 'activity'>('team');

  const [showMeetingBookedModal, setShowMeetingBookedModal] = useState(false);
  const [showMeetingCompletedModal, setShowMeetingCompletedModal] = useState(false);
  const [showActiveAccountModal, setShowActiveAccountModal] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeIdx, setEditingEmployeeIdx] = useState<number | undefined>(undefined);
  const [isEditingLeadInfo, setIsEditingLeadInfo] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [callNotesState, setCallNotesState] = useState<{ open: boolean; callId: string }>({ open: false, callId: '' });
  const [leadInfoForm, setLeadInfoForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    personLinkedinUrl: '',
    assignedAgent: '',
    status: 'New Lead',
  });

  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/sdr') ? '/sdr' :
    pathname.startsWith('/hr') ? '/hr' :
      pathname.startsWith('/leadgen') ? '/leadgen' : '/admin';

  useEffect(() => {
    if (lead) {
      setLeadInfoForm({
        name: lead.name || '',
        title: lead.title || '',
        email: lead.email || '',
        phone: lead.phone || '',
        personLinkedinUrl: lead.personLinkedinUrl || '',
        assignedAgent: lead.assignedAgent || '',
        status: lead.status || 'New Lead',
      });
    }
  }, [lead]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold text-foreground mb-2">Lead not found</h2>
        <Link href={`${basePath}/leads`}><Button variant="outline">Back to Leads</Button></Link>
      </div>
    );
  }

  const leadCalls = allCalls.filter((c: any) => c.leadId === lead.id || c.leadId === lead._id);

  const handleCall = async (phoneToCall?: string) => {
    const phoneNumber = phoneToCall || lead.phone || lead.companyPhone;
    if (!phoneNumber) {
      toast.error('No phone number available');
      return;
    }

    try {
      const result = await createCall.mutateAsync({
        leadId: lead.id || lead._id || '',
        leadName: lead.name,
        agentName: user?.name || 'Unknown',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: '0 min',
        status: 'Completed',
        notes: 'Call initiated from Lead Details',
        hasRecording: false,
      });
      const callId = result?.id || result?._id || '';
      if (callId) {
        setCallNotesState({ open: true, callId });
      }
    } catch (error) {
      console.error('Failed to log call:', error);
    }

    // Open the system dialer
    window.location.href = toTelUri(phoneNumber);
    toast.success('Call logged and opening dialer...');
  };

  const handleSaveCallNotes = async (notes: string, duration: number, followUpDate?: string) => {
    try {
      await updateCallMutation.mutateAsync({ id: callNotesState.callId, data: { notes, duration: duration * 60 } });
      if (followUpDate && leadId) {
        await scheduleFollowUpMutation.mutateAsync({ leadId, date: followUpDate });
        toast.success('Call notes & follow-up saved');
      } else {
        toast.success('Call notes saved');
      }
    } catch {
      toast.error('Failed to save call notes');
    } finally {
      setCallNotesState({ open: false, callId: '' });
    }
  };

  const handleCompleteFollowUp = async () => {
    try {
      await completeFollowUp.mutateAsync(lead.id);
      toast.success('Follow-up completed');
    } catch {
      toast.error('Failed to complete follow-up');
    }
  };

  const NEXT_STEP_STAGES = ['qualified', 'proposal sent', 'negotiation'];

  const getStageIdByName = (stageName: LeadStatus) => {
    const stage = selectableStages.find((item: any) => item.name === stageName);
    const resolvedStageId = stage?.id || stage?._id;

    if (!resolvedStageId) {
      throw new Error(`${stageName} stage is not configured`);
    }

    return resolvedStageId;
  };

  const handleStageChange = async (stageId: string) => {
    const stage = selectableStages.find((s: any) => (s.id || s._id) === stageId);
    if (!stage) return;

    if (stage.name === 'Appointment Set') {
      setShowMeetingBookedModal(true);
      return;
    }

    if (stage.name === 'Active Account') {
      setShowActiveAccountModal(true);
      return;
    }

    if (stage.name === 'In Progress') {
      setNextStepPrompt({ status: 'In Progress' });
      return;
    }

    try {
      await updateStage.mutateAsync({ leadId: leadId as string, stageId: stage.id || (stage as any)._id });
      toast.success(`Stage changed to ${stage.name}`);
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const confirmStatusWithNextStep = async () => {
    if (!nextStepPrompt) return;
    try {
      const updateData: any = { status: nextStepPrompt.status };
      if (nextStepDate) updateData.nextFollowUp = nextStepDate;
      if (nextStepNote) {
        updateData.activities = [...(lead.activities || []), {
          type: 'note',
          description: `Next step: ${nextStepNote}`,
          timestamp: new Date().toISOString(),
          agent: lead.assignedAgent || 'User',
        }];
      }
      await updateLead.mutateAsync({ id: lead.id, data: updateData });
      toast.success(`Status changed to ${nextStepPrompt.status}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setNextStepPrompt(null);
    }
  };

  const onMeetingBooked = async (data: MeetingBookedData) => {
    try {
      const appointmentStageId = getStageIdByName('Appointment Set');

      await createMeeting.mutateAsync({
        title: `Meeting with ${lead.name}`,
        date: data.date,
        time: data.time,
        duration: 30,
        leadId: lead.id,
        leadName: lead.name,
        ams: data.ams,
        description: data.notes,
        status: 'scheduled'
      });

      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          status: 'Appointment Set',
          pipelineStage: appointmentStageId,
        },
      });

      toast.success('Meeting booked successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to book meeting');
    }
  };

  const onMeetingCompleted = async (driveLink: string) => {
    try {
      const activeLeadMeetings = meetings.filter((m: any) => (m.leadId === lead.id || m.leadId === lead._id) && m.status === 'scheduled');
      if (activeLeadMeetings.length > 0) {
        const meetingToUpdate = activeLeadMeetings[0];
        await updateMeeting.mutateAsync({ id: meetingToUpdate.id, data: { status: 'completed', driveLink } });
      }

      toast.success('Meeting marked as completed');
    } catch {
      toast.error('Failed to complete meeting');
    }
  };

  const onActiveAccount = async (data: ActiveAccountData) => {
    try {
      const activeAccountStageId = getStageIdByName('Active Account');

      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          status: 'Active Account',
          pipelineStage: activeAccountStageId,
          contractSignDate: data.contractSignDate || null,
          activeServiceDate: data.activeServiceDate || null,
          assignedVA: data.assignedVA.trim(),
        }
      });

      toast.success('Lead converted to Active Account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert to Active Account');
    }
  };


  const handleSaveNotes = async () => {
    try {
      await createActivity.mutateAsync({
        leadId: lead.id || lead._id,
        type: 'note',
        description: notes,
      });
      setEditingNotes(false);
      setNotes('');
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleFieldUpdate = async (data: any) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, data });
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSaveLeadInfo = async () => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          name: leadInfoForm.name.trim(),
          title: leadInfoForm.title.trim(),
          email: leadInfoForm.email.trim(),
          phone: leadInfoForm.phone.trim(),
          personLinkedinUrl: leadInfoForm.personLinkedinUrl.trim(),
          assignedAgent: leadInfoForm.assignedAgent.trim(),
        },
      });
      setIsEditingLeadInfo(false);
      toast.success('Lead info updated');
    } catch {
      toast.error('Failed to update lead info');
    }
  };

  const handleQualificationToggle = async (field: 'rightPerson' | 'realNeed' | 'timing') => {
    const current = lead.qualification || { rightPerson: false, realNeed: false, timing: false, qualifiedAt: null, qualifiedBy: '' };
    const updated = { ...current, [field]: !current[field] };
    // If all 3 are now true and weren't before, mark qualifiedAt
    if (updated.rightPerson && updated.realNeed && updated.timing && !current.qualifiedAt) {
      updated.qualifiedAt = new Date().toISOString() as any;
      updated.qualifiedBy = lead.assignedAgent;
    }
    await handleFieldUpdate({ qualification: updated });
  };

  const handleSaveEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    const current = lead.employees || [];
    const updated = editingEmployeeIdx !== undefined
      ? current.map((e, i) => i === editingEmployeeIdx ? { ...e, ...employeeData } : e)
      : [...current, employeeData];
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { employees: updated } });
      setShowEmployeeForm(false);
      setEditingEmployeeIdx(undefined);
      toast.success('Employee saved');
    } catch {
      toast.error('Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (idxToDelete: number) => {
    const current = lead.employees || [];
    const updated = current.filter((_, i) => i !== idxToDelete);
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { employees: updated } });
      toast.success('Employee deleted');
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  const checkCadenceTouch = async (touchIdx: number) => {
    if (!lead.cadence) return;
    const updatedTouches = [...lead.cadence.touches];
    updatedTouches[touchIdx] = { ...updatedTouches[touchIdx], completed: true, completedAt: new Date().toISOString() };

    // Create activity
    const touch = updatedTouches[touchIdx];
    const activityDesc = `Cadence touch completed: ${touch.type} (Day ${touch.day})`;

    // Optimistic update
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        data: {
          cadence: { ...lead.cadence, touches: updatedTouches },
        }
      });
      await createActivity.mutateAsync({
        leadId: lead.id || lead._id,
        type: 'cadence-touch',
        description: activityDesc,
      });
      toast.success('Touch completed');
    } catch {
      toast.error('Failed to update cadence');
    }
  };

  const qualityGate = checkQualityGate(lead);
  const cadenceTasks = getCadenceTasks(lead.cadence);
  const cadenceTemplate = lead.cadence ? CADENCE_TEMPLATES.find(t => t.key === lead.cadence!.type) : null;

  // All phone numbers for display
  const phones = [
    { label: 'Work Direct', value: lead.workDirectPhone },
    { label: 'Mobile', value: lead.mobilePhone },
    { label: 'Home', value: lead.homePhone },
    { label: 'Corporate', value: lead.corporatePhone },
    { label: 'Company', value: lead.companyPhone },
    { label: 'Other', value: lead.otherPhone },
  ].filter(p => p.value);

  // Warning: Meeting Completed with no next step
  const normalizedLeadStatus = normalizeStatus(lead.status);
  const showNoNextStepWarning =
    (normalizedLeadStatus === 'meeting completed' || normalizedLeadStatus === 'negotiation') &&
    !lead.nextFollowUp;

  // Normalize activities and stageHistory into a single timeline
  const combinedHistory = Array.isArray(activities) ? activities : [];

  const noteActivities = combinedHistory.filter((a: any) => a.type === 'note');
  const nonNoteActivities = combinedHistory.filter((a: any) => a.type !== 'note');

  return (
    <>
      <div className="space-y-6">
        {/* No next-step warning */}
        {showNoNextStepWarning && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No next step set</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">This lead is in <strong>{lead.status}</strong> but has no follow-up date. Set one below to keep the deal moving.</p>
            </div>
          </div>
        )}

        {/* Next-step modal */}
        {nextStepPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-foreground">Set Next Step</h2>
              <p className="text-sm text-muted-foreground">
                Moving to <span className="font-semibold text-foreground">{nextStepPrompt.status}</span> — define what happens next to keep momentum.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={nextStepDate}
                    onChange={e => setNextStepDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Next Step Note</label>
                  <input
                    value={nextStepNote}
                    onChange={e => setNextStepNote(e.target.value)}
                    placeholder="e.g. Send proposal, Book demo, Follow up on budget..."
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setNextStepPrompt(null)}>Skip</Button>
                <Button onClick={confirmStatusWithNextStep} disabled={updateLead.isPending}>
                  {updateLead.isPending ? 'Saving...' : 'Confirm & Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`${basePath}/leads`}>
              <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{lead.name}</h1>
                {lead.priority && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityBadgeClass(lead.priority)}`}>
                    {lead.priority}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {lead.title && `${lead.title} · `}{lead.companyName || 'Lead Details'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-12 sm:ml-0">
            {(lead.phone || lead.companyPhone || (lead.employees?.length ?? 0) > 0) && (
              <Button size="sm" onClick={() => setShowContactPicker(true)}>
                <PhoneCall className="h-4 w-4 mr-1" />
                Call Now
              </Button>
            )}
          </div>
        </div>

        {/* â"€â"€ Company Card â€" Full Width â"€â"€ */}
        <div className="rounded-xl border border-border bg-card shadow-card p-4 sm:p-8">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-foreground truncate">{lead.companyName || 'Unknown Company'}</h3>
            </div>
            <div className="flex flex-col items-end gap-2 min-w-[210px]">
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Assigned Agent</p>
                <p className="text-sm font-semibold text-foreground">{lead.assignedAgent || 'Unassigned'}</p>
              </div>
              <select
                value={(lead as any).pipelineStage?.id || (lead as any).pipelineStage?._id || (lead as any).pipelineStage || ''}
                onChange={(e) => handleStageChange(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-lg border px-3 text-sm font-semibold outline-none transition-colors bg-secondary/10 focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Select Stage —</option>
                {selectableStages.map((s: any) => {
                  const stageId = s.id || s._id;
                  const currentStageName = (lead as any).pipelineStage?.name || lead.status;
                  const currentOrder = STAGE_ORDER.get(currentStageName) ?? 0;
                  const stageOrder = STAGE_ORDER.get(s.name) ?? s.order ?? 0;
                  const isRollbackToContacted = s.name === 'Contacted' && stageOrder < currentOrder;
                  const isBackward = stageOrder < currentOrder && !isRollbackToContacted;
                  return (
                    <option key={stageId} value={stageId} disabled={isBackward} className={`bg-background text-foreground ${isBackward ? 'text-muted-foreground opacity-50' : ''}`}>{s.name}</option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border">
            {lead.employeeCount && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-sm font-semibold text-foreground">{lead.employeeCount}</p>
                </div>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline truncate block">{lead.website}</a>
                </div>
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Street Address</p>
                  <p className="text-sm font-semibold text-foreground truncate">{lead.address}</p>
                </div>
              </div>
            )}
            {lead.city && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="text-sm font-semibold text-foreground truncate">{lead.city}</p>
                </div>
              </div>
            )}
            {lead.state && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">State</p>
                  <p className="text-sm font-semibold text-foreground truncate">{lead.state}</p>
                </div>
              </div>
            )}
            {(lead as any).country && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-semibold text-foreground truncate">{(lead as any).country}</p>
                </div>
              </div>
            )}
            {lead.companyLinkedinUrl && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Company LinkedIn</p>
                  <a href={lead.companyLinkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline truncate block">View Page</a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="border-b border-border">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('team')}
                  className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'team' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Team & Qualifications
                  {activeTab === 'team' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'activity' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Activity & Notes
                  {activeTab === 'activity' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              </div>
              {activeTab === 'team' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mb-2 gap-1.5"
                  onClick={() => { setEditingEmployeeIdx(undefined); setShowEmployeeForm(true); }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </Button>
              )}
            </div>
          </div>

          <div className="pt-6">
            {activeTab === 'team' ? (
              <div className="space-y-6">
                {/* ── Person Profile Card ── */}
                <div className="rounded-xl border border-border bg-card shadow-card p-4 sm:p-8 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold shrink-0">
                        {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'LD'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-foreground">{lead.name}</h3>
                        {lead.title && <p className="text-sm text-muted-foreground mt-0.5">{lead.title}</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isEditingLeadInfo ? 'secondary' : 'ghost'}
                      className={`h-8 w-8 px-0 ${isEditingLeadInfo ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setIsEditingLeadInfo((value) => !value)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  {isEditingLeadInfo && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/20 p-4">
                      <input
                        value={leadInfoForm.name}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                      <input
                        value={leadInfoForm.title}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Title"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                      <input
                        value={leadInfoForm.email}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Email"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                      <input
                        value={leadInfoForm.phone}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                      <input
                        value={leadInfoForm.personLinkedinUrl}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, personLinkedinUrl: e.target.value }))}
                        placeholder="LinkedIn URL"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                      <select
                        value={leadInfoForm.assignedAgent}
                        onChange={(e) => setLeadInfoForm((prev) => ({ ...prev, assignedAgent: e.target.value }))}
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Unassigned</option>
                        {sdrs.map((sdr: any) => (
                          <option key={sdr.id} value={sdr.name}>{sdr.name}</option>
                        ))}
                      </select>
                      <div className="sm:col-span-2 lg:col-span-2 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsEditingLeadInfo(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveLeadInfo} disabled={updateLead.isPending}>
                          {updateLead.isPending ? 'Saving...' : 'Save Lead Info'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5 border-t border-border">
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium text-foreground truncate">{lead.email}</p>
                        </div>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium text-foreground truncate">{lead.phone}</p>
                        </div>
                      </div>
                    )}
                    {lead.personLinkedinUrl && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">LinkedIn</p>
                          <a href={lead.personLinkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">View Profile</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* Scheduled Appointment Card */}
                {(() => {
                  const scheduledMeetings = meetings.filter((m: any) =>
                    (m.leadId === lead.id || m.leadId === (lead as any)._id) && m.status === 'scheduled'
                  );
                  if (scheduledMeetings.length === 0) return null;
                  const nextMeeting = scheduledMeetings.sort((a: any, b: any) =>
                    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                  )[0];
                  return (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 shadow-card p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-300">Scheduled Appointment</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Title</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{nextMeeting.title}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Date</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {new Date(nextMeeting.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {nextMeeting.time && (
                          <div>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Time</p>
                            <p className="text-sm font-semibold text-foreground mt-0.5">{nextMeeting.time}</p>
                          </div>
                        )}
                        {nextMeeting.description && (
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Notes</p>
                            <p className="text-sm text-foreground mt-0.5">{nextMeeting.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Employees Section */}
                <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Employees</h3>

                  {showEmployeeForm && (
                    <div className="rounded-lg border border-border bg-secondary/20 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        {editingEmployeeIdx !== undefined ? 'Edit Employee' : 'New Employee'}
                      </h4>
                      <EmployeeForm
                        initial={editingEmployeeIdx !== undefined ? lead.employees?.[editingEmployeeIdx] : undefined}
                        onSave={handleSaveEmployee}
                        onCancel={() => { setShowEmployeeForm(false); setEditingEmployeeIdx(undefined); }}
                      />
                    </div>
                  )}

                  {(lead.employees?.length ?? 0) > 0 ? (
                    <div className="space-y-4">
                      {lead.employees!.map((emp, idx) => (
                        <div key={emp.id || idx} className="rounded-xl border border-border bg-secondary/5 p-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary text-base font-bold shrink-0">
                                {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-base font-bold text-foreground truncate">{emp.name}</p>
                                  {emp.isDecisionMaker && (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium">
                                      DM
                                    </span>
                                  )}
                                  {emp.leftOrganization && (
                                    <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[10px] font-medium">
                                      Left Org
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Team Member</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditingEmployeeIdx(idx); setShowEmployeeForm(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this employee?')) {
                                    handleDeleteEmployee(idx);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-border/50">
                            {emp.email && (
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                                  <p className="text-xs font-medium text-foreground truncate">{emp.email}</p>
                                </div>
                              </div>
                            )}
                            {emp.phones?.length > 0 && (
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Phone</p>
                                  <button
                                    onClick={() => handleCall(emp.phones[0].number)}
                                    className="text-xs font-medium text-primary hover:underline truncate"
                                  >
                                    {emp.phones[0].number}
                                  </button>
                                </div>
                              </div>
                            )}
                            {emp.linkedin && (
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                                  <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">LinkedIn</p>
                                  <a
                                    href={emp.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-primary hover:underline truncate block"
                                  >
                                    View Profile
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !showEmployeeForm && (
                      <p className="text-sm text-muted-foreground">No employees added yet.</p>
                    )
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Lead Classification & Qualification */}
                  <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Classification & Qualification</h3>

                    {/* Priority */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
                      <select
                        value={lead.priority || ''}
                        onChange={e => handleFieldUpdate({ priority: e.target.value })}
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                      >
                        <option value="">— Select —</option>
                        {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                    </div>

                    {/* Industry */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Industry</p>
                      <select
                        value={lead.segment || ''}
                        onChange={e => handleFieldUpdate({ segment: e.target.value })}
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                      >
                        <option value="">— Select —</option>
                        {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Source Channel */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Source Channel</p>
                      <input
                        list="source-options"
                        value={(lead as any).sourceChannel || ''}
                        onChange={e => handleFieldUpdate({ sourceChannel: e.target.value })}
                        placeholder="Type or select source"
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground mb-4"
                      />
                      <datalist id="source-options">
                        {SOURCE_CHANNELS.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>

                    {/* Quality Gate */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        {qualityGate.pass ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Quality Gate {qualityGate.pass ? '✓ Passed' : `— ${qualityGate.missing.length} missing`}
                        </p>
                      </div>
                      {!qualityGate.pass && (
                        <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 ml-6 list-disc">
                          {qualityGate.missing.map(m => <li key={m}>{m}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Phone Numbers */}
                  {phones.length > 0 && (
                    <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">Phone Numbers</h3>
                      {phones.map(p => (
                        <div key={p.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{p.label}</p>
                              <a href={toTelUri(p.value)} className="text-sm font-medium text-primary hover:underline">{p.value}</a>
                            </div>
                          </div>
                          <a href={toTelUri(p.value)} title="Call this number">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                              <PhoneCall className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Add Note */}
                <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Add Note</h3>
                  <div className="space-y-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type a note (visible across all panels)..."
                      className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleSaveNotes} disabled={!notes.trim()}>
                        Post Note
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Unified Activity Timeline */}
                <div className="rounded-xl border border-border bg-card shadow-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Timeline</h3>
                    <span className="text-sm text-muted-foreground">{combinedHistory.length} events</span>
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {combinedHistory.map((activity: any) => {
                      const Icon = activityIcons[activity.type] || FileText;
                      return (
                        <div key={activity.id || activity.timestamp} className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityColors[activity.type] || 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {activity.agent} · {new Date(activity.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {combinedHistory.length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div >
      <MeetingBookedModal
        open={showMeetingBookedModal}
        onOpenChange={setShowMeetingBookedModal}
        leadName={lead.name}
        onSubmit={onMeetingBooked}
      />
      <MeetingCompletedModal
        open={showMeetingCompletedModal}
        onOpenChange={setShowMeetingCompletedModal}
        leadName={lead.name}
        onSubmit={onMeetingCompleted}
      />
      <ActiveAccountModal
        open={showActiveAccountModal}
        onOpenChange={setShowActiveAccountModal}
        leadName={lead.name}
        onSubmit={onActiveAccount}
      />
      <ContactPickerModal
        lead={lead}
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onCall={(phone) => handleCall(phone)}
      />
      <CallNotesModal
        open={callNotesState.open}
        leadName={lead.name}
        onSave={handleSaveCallNotes}
        onClose={() => setCallNotesState({ open: false, callId: '' })}
      />
    </>
  );
}
