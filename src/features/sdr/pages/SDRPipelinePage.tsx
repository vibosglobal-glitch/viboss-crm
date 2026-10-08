'use client';
import { useState } from 'react';
import { useLeads, useAgents, useCreateCall } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
// xlsx loaded on demand — keeps ~400 KB out of the initial bundle
import { PIPELINE_STAGES } from '@/features/leads/constants/pipeline';
import { toast } from 'sonner';

export default function SDRPipelinePage() {
  const { user } = useAuth();
  const { data: allLeads = [], isLoading } = useLeads();
  const { data: agents = [] } = useAgents();
  const createCall = useCreateCall();
  const [userFilter, setUserFilter] = useState('all');

  const handleCall = async (lead: any) => {
    if (!lead.phone) {
      toast.error('No phone number available');
      return;
    }

    try {
      await createCall.mutateAsync({
        leadId: lead.id || lead._id,
        leadName: lead.name,
        agentName: user?.name || 'Unknown',
        date: new Date(),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: '0 min',
        status: 'Completed',
        notes: 'Call initiated from SDR Pipeline',
        hasRecording: false,
      });
      toast.success('Call logged');
    } catch (error) {
      console.error('Failed to log call:', error);
    }

    window.location.href = `tel:${lead.phone.replace(/[^+\d]/g, '')}`;
  };

  const leads = allLeads.filter((l: any) => {
    const isOwner = !l.assignedAgent || l.assignedAgent === user?.name;
    const matchesUser = userFilter === 'all' || l.assignedAgent === userFilter || l.addedBy === userFilter;
    if (user?.role === 'admin' || user?.role === 'leadgen' || user?.role === 'hr') {
      return matchesUser;
    }
    // SDRs and standard users only see their own pipeline
    return isOwner && matchesUser;
  });

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={3} gridClassName="grid grid-cols-1 sm:grid-cols-3 gap-4" />
        <DashboardTableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  const activeFilterLabel = userFilter === 'all' ? 'All Users' : userFilter;

  const handleExport = async () => {
    const exportData = leads.map((lead: any) => ({
      Name: lead.name,
      Company: lead.companyName || '',
      Phone: lead.phone || lead.workDirectPhone || '',
      Email: lead.email || '',
      Status: lead.status,
      AssignedAgent: lead.assignedAgent || 'Unassigned',
      CallCount: lead.callCount || 0,
      Source: lead.source || '',
      Location: [lead.city, lead.state].filter(Boolean).join(', ') || ''
    }));

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pipeline');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SDR_Pipeline_Export_${date}.xlsx`);
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Your personal lead funnel</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Pipeline
          </Button>
        </div>
        {user?.role !== 'sdr' && (
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground w-[160px]"
          >
            <option value="all">All Users</option>
            {agents.map((agent: any) => (
              <option key={agent.id} value={agent.name}>{agent.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Leads: {leads.length}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Filter: {activeFilterLabel}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const colLeads = leads.filter((l: any) => l.status === stage.key);
          return (
            <div key={stage.key} className="min-w-[220px] flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                <Badge variant="secondary" className="text-xs h-5 px-1.5">{colLeads.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {colLeads.map((lead: any) => (
                  <div key={lead.id} className="rounded-lg border border-border bg-card p-3.5 shadow-card hover:shadow-card-hover transition-shadow">
                    <p className="font-medium text-foreground text-sm">{lead.name}</p>
                    {lead.phone ? (
                      <button onClick={() => handleCall(lead)} className="text-xs text-primary hover:underline mt-1 block text-left">{lead.phone}</button>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">No phone</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{lead.email}</span>
                      {lead.callCount > 0 && (
                        <span className="text-xs text-muted-foreground">{lead.callCount} calls</span>
                      )}
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-xs text-muted-foreground">No leads</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
