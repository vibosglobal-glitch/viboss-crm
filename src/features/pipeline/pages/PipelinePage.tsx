'use client';

import dynamic from 'next/dynamic';
import { memo, useState } from 'react';
import { usePipelineBoard, useUpdateLeadStage } from '../hooks/usePipeline';
import { useCreateMeeting, useUpdateLead } from '@/hooks/useApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, DollarSign, GripVertical } from 'lucide-react';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, useDraggable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import type { MeetingBookedData } from '@/features/meetings/components/MeetingBookedModal';
import type { ActiveAccountData } from '@/features/leads/components/ActiveAccountModal';

const MeetingBookedModal = dynamic(
  () => import('@/features/meetings/components/MeetingBookedModal').then((mod) => mod.MeetingBookedModal),
  { ssr: false }
);

const ActiveAccountModal = dynamic(
  () => import('@/features/leads/components/ActiveAccountModal').then((mod) => mod.ActiveAccountModal),
  { ssr: false }
);

type PendingStageChange = {
  lead: any;
  stageId: string;
  stageName: string;
};

const formatDateYmd = (value: Date | string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const KanbanCard = memo(function KanbanCard({ lead }: { lead: any }) {
  const leadId = lead.id || lead._id;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: leadId,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group min-h-[100px] touch-none"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <h4 className="font-semibold text-sm line-clamp-1 pr-6">{lead.firstName} {lead.lastName}</h4>
      <p className="text-xs text-muted-foreground mt-0.5">{lead.companyName || lead.phone || lead.email}</p>

      <div className="mt-3 flex items-center justify-between">
        {lead.assignedTo ? (
          <div className="flex items-center gap-1.5" title={lead.assignedTo.name}>
            {lead.assignedTo.avatar ? (
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {lead.assignedTo.avatar}
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {lead.assignedTo.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{lead.assignedTo.name}</span>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal">Unassigned</Badge>
        )}

        <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <DollarSign className="h-3 w-3 mr-0.5" />
          {lead.dealValue?.toLocaleString() || 0}
        </div>
      </div>
    </div>
  );
});

const KanbanColumn = memo(function KanbanColumn({ col }: { col: any }) {
  const stage = col.stage || col;
  const stageId = stage.id || stage._id || col._id || col.id;

  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
    data: { stageId: stageId, stageName: stage.name },
  });

  return (
    <div className="min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col pt-1">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color || '#3B82F6' }} />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">${(col.totalValue || 0).toLocaleString()}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">{col.count}</Badge>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2.5 space-y-2.5 transition-colors duration-200 ${isOver ? 'bg-secondary/50 border-2 border-dashed border-primary/50' : 'bg-muted/30 border-2 border-transparent'
          }`}
      >
        {col.leads.map((lead: any) => (
          <KanbanCard key={lead.id || lead._id} lead={lead} />
        ))}
        {col.leads.length === 0 && (
          <div className="h-full min-h-[100px] flex items-center justify-center p-4 border border-dashed border-border/50 rounded-lg text-center opacity-50">
            <span className="text-xs text-muted-foreground">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default function PipelinePage() {
  const { data: board = [], isLoading } = usePipelineBoard();
  const updateStageMutation = useUpdateLeadStage();
  const updateLeadMutation = useUpdateLead();
  const createMeetingMutation = useCreateMeeting();
  const [activeLead, setActiveLead] = useState<any>(null);
  const [pendingStageChange, setPendingStageChange] = useState<PendingStageChange | null>(null);
  const [showMeetingBookedModal, setShowMeetingBookedModal] = useState(false);
  const [showActiveAccountModal, setShowActiveAccountModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={3} gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <DashboardTableSkeleton rows={7} cols={4} />
      </div>
    );
  }

  const stageCount = board.length;
  const leadCount = board.reduce((total: number, col: any) => total + (col?.count || col?.leads?.length || 0), 0);
  const totalValue = board.reduce((total: number, col: any) => total + (col?.totalValue || 0), 0);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');

      const exportData = board.flatMap(col =>
        col.leads.map(lead => ({
          Name: `${lead.firstName} ${lead.lastName}`,
          Company: lead.companyName || lead.company || '',
          Phone: lead.phone || '',
          Email: lead.email || '',
          Stage: col.stage?.name || col.name || 'Unassigned Stage',
          AssignedTo: lead.assignedTo?.name || 'Unassigned',
          DealValue: (lead as any).dealValue || 0,
          Created: formatDateYmd(lead.createdAt || Date.now())
        }))
      );

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pipeline');

      const date = formatDateYmd(new Date());
      XLSX.writeFile(workbook, `Pipeline_Export_${date}.xlsx`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export pipeline data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveLead(active.data.current?.lead);
  };

  const getLeadName = (lead: any) => {
    const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(' ').trim();
    return fullName || lead?.name || lead?.companyName || lead?.company || 'this lead';
  };

  const closeMeetingModal = (open: boolean) => {
    setShowMeetingBookedModal(open);
    if (!open) {
      setPendingStageChange((current) => current?.stageName === 'Appointment Set' ? null : current);
    }
  };

  const closeActiveAccountModal = (open: boolean) => {
    setShowActiveAccountModal(open);
    if (!open) {
      setPendingStageChange((current) => current?.stageName === 'Active Account' ? null : current);
    }
  };

  const handleMeetingBooked = async (data: MeetingBookedData) => {
    const change = pendingStageChange;
    if (!change) return;

    try {
      await createMeetingMutation.mutateAsync({
        title: `Meeting with ${getLeadName(change.lead)}`,
        date: data.date,
        time: data.time,
        duration: 30,
        leadId: change.lead.id || change.lead._id,
        leadName: getLeadName(change.lead),
        ams: data.ams,
        description: data.notes,
        status: 'scheduled',
      });

      await updateLeadMutation.mutateAsync({
        id: change.lead.id || change.lead._id,
        data: {
          status: 'Appointment Set',
          pipelineStage: change.stageId,
        },
      });

      toast.success('Meeting booked successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to book meeting');
    } finally {
      setPendingStageChange(null);
    }
  };

  const handleActiveAccount = async (data: ActiveAccountData) => {
    const change = pendingStageChange;
    if (!change) return;

    try {
      await updateLeadMutation.mutateAsync({
        id: change.lead.id || change.lead._id,
        data: {
          status: 'Active Account',
          pipelineStage: change.stageId,
          contractSignDate: data.contractSignDate || null,
          activeServiceDate: data.activeServiceDate || null,
          assignedVA: data.assignedVA.trim(),
        },
      });

      toast.success('Lead converted to Active Account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert to Active Account');
    } finally {
      setPendingStageChange(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const currentLead = active.data.current?.lead;
    if (!currentLead) return;
    const newStageId = over.id as string;
    const newStageName = over.data.current?.stageName;

    const currentStageId = typeof currentLead.pipelineStage === 'object' ? (currentLead.pipelineStage?.id || currentLead.pipelineStage?._id) : currentLead.pipelineStage;
    if (currentStageId !== newStageId) {
      if (newStageName === 'Appointment Set') {
        setPendingStageChange({ lead: currentLead, stageId: newStageId, stageName: newStageName });
        setShowMeetingBookedModal(true);
        return;
      }

      if (newStageName === 'Active Account') {
        setPendingStageChange({ lead: currentLead, stageId: newStageId, stageName: newStageName });
        setShowActiveAccountModal(true);
        return;
      }

      updateStageMutation.mutate({ leadId, stageId: newStageId });
    }
  };

  return (
    <>
      <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Interactive kanban view of your lead funnel</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2" disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Stages: {stageCount}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Leads: {leadCount}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Value: ${totalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex-1 overflow-x-auto pb-4 -mx-1 px-1">
          {!isLoading && board.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No pipeline stages found. Run `npm run seed:stages` or refresh after server auto-seeding.
            </div>
          )}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full min-h-[500px]">
              {board.map((col: any, i: number) => {
                const key = col.stage?.id || col._id || col.id || i;
                return <KanbanColumn key={key} col={col} />;
              })}
            </div>

            <DragOverlay>
              {activeLead ? (
                <div className="w-[280px] opacity-90 scale-105 shadow-xl rotate-2">
                  <KanbanCard lead={activeLead} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {showMeetingBookedModal && (
        <MeetingBookedModal
          open={showMeetingBookedModal}
          onOpenChange={closeMeetingModal}
          leadName={getLeadName(pendingStageChange?.lead)}
          onSubmit={handleMeetingBooked}
        />
      )}

      {showActiveAccountModal && (
        <ActiveAccountModal
          open={showActiveAccountModal}
          onOpenChange={closeActiveAccountModal}
          leadName={getLeadName(pendingStageChange?.lead)}
          onSubmit={handleActiveAccount}
        />
      )}
    </>
  );
}
