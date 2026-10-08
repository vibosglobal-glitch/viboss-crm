'use client';
import Link from 'next/link';
import { Users, FileSpreadsheet, UserCheck, TrendingUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/common/KPICard';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { useLeads, useAgents } from '@/hooks/useApi';
import DateFilter, { DateRange, filterByDateRange } from '@/components/common/DateFilter';
import { useState } from 'react';
import { ActiveAccountsListModal } from '../../leads/components/ActiveAccountsListModal';
import { AddLeadDialog } from '../components/AddLeadDialog';
import { countLeadsByStatus, getLeadActivityDate } from '@/features/leads/utils/status';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  allTime: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  last90days: 'Last 90 Days',
  thisMonth: 'This Month',
};

export default function LeadGenDashboard() {
  const { data: allLeads = [], isLoading } = useLeads();
  const { data: agents = [] } = useAgents();

  const [dateRange, setDateRange] = useState<DateRange>('last7days');
  const [isActiveAccountsModalOpen, setIsActiveAccountsModalOpen] = useState(false);
  const leads = allLeads; // Already filtered server-side for lead_gen role
  const filteredLeads = filterByDateRange(leads, dateRange, getLeadActivityDate);

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={5} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardTableSkeleton rows={6} cols={2} />
          <DashboardTableSkeleton rows={6} cols={2} />
        </div>
      </div>
    );
  }

  const sdrs = agents.filter((a: any) => a.role === 'sdr');
  const totalLeads = leads.length;
  const assignedLeads = leads.filter((l: any) => l.assignedAgent && l.assignedAgent !== 'Unassigned').length;
  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Custom Range';

  // Leads per SDR breakdown
  const sdrBreakdown = sdrs.map((sdr: any) => ({
    name: sdr.name,
    avatar: sdr.avatar,
    count: leads.filter((l: any) => l.assignedAgent === sdr.name).length,
  })).sort((a: any, b: any) => b.count - a.count);

  // Recent leads (last 5)
  const recentLeads = [...leads]
    .sort((a: any, b: any) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Gen Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your lead pipeline</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 items-center sm:w-auto sm:justify-end">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Button asChild variant="outline">
            <Link href="/leadgen/leads">
              <Users className="h-4 w-4 mr-2" />
              Database
            </Link>
          </Button>
          <AddLeadDialog />
          <Button asChild className="gradient-primary border-0">
            <Link href="/leadgen/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Range: {dateRangeLabel}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Assigned: {assignedLeads}/{totalLeads}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="animate-slide-up stagger-1">
          <KPICard title="New Leads" value={countLeadsByStatus(filteredLeads, 'New Lead')} icon={Users} subtitle={dateRangeLabel} link="/leadgen/leads" />
        </div>
        <div className="animate-slide-up stagger-2">
          <KPICard title="In Progress" value={countLeadsByStatus(filteredLeads, 'In Progress')} icon={TrendingUp} subtitle={dateRangeLabel} link="/leadgen/leads" />
        </div>
        <div className="animate-slide-up stagger-3">
          <KPICard title="Contacted" value={countLeadsByStatus(filteredLeads, 'Contacted')} icon={UserCheck} subtitle={dateRangeLabel} link="/leadgen/leads" />
        </div>
        <div className="animate-slide-up stagger-4">
          <KPICard title="Appointment Set" value={countLeadsByStatus(filteredLeads, 'Appointment Set')} icon={UserCheck} subtitle={dateRangeLabel} link="/leadgen/meetings" />
        </div>
        <div className="animate-slide-up stagger-5">
          <KPICard title="Active Accounts" value={countLeadsByStatus(filteredLeads, 'Active Account')} icon={UserCheck} subtitle={dateRangeLabel} onClick={() => setIsActiveAccountsModalOpen(true)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per SDR */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4">Leads per SDR</h2>
          {sdrBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SDRs found.</p>
          ) : (
            <div className="space-y-3">
              {sdrBreakdown.map((sdr: any) => (
                <div key={sdr.name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                    {sdr.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{sdr.name}</span>
                      <span className="text-sm text-muted-foreground">{sdr.count} leads</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: totalLeads > 0 ? `${Math.round((sdr.count / totalLeads) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Leads</h2>
            <Link href="/leadgen/leads" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet. Upload a CSV to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.companyName || '—'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${lead.status === 'New Lead' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        lead.status === 'Active Account' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>{lead.status}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.assignedAgent || 'Unassigned'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Button asChild className="gradient-primary border-0 justify-start">
            <Link href="/leadgen/upload"><FileSpreadsheet className="h-4 w-4 mr-2" />Import CSV</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/leadgen/leads"><Users className="h-4 w-4 mr-2" />Manage Leads</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/leadgen/linkedin"><Users className="h-4 w-4 mr-2" />LinkedIn List</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/leadgen/email"><Users className="h-4 w-4 mr-2" />Email Outreach</Link>
          </Button>
        </div>
      </div>

      <ActiveAccountsListModal
        isOpen={isActiveAccountsModalOpen}
        onClose={() => setIsActiveAccountsModalOpen(false)}
        leads={filteredLeads}
      />
    </div>
  );
}
