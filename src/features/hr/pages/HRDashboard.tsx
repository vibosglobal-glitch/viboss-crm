'use client';
import Link from 'next/link';
import { Users, PhoneCall, CheckCircle2, CalendarDays, ArrowRight } from 'lucide-react';
import KPICard from '@/components/common/KPICard';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton } from '@/components/common/DashboardSkeletons';
import { useHRDashboard } from '@/hooks/useApi';
import DateFilter, { DateRange } from '@/components/common/DateFilter';
import { useState } from 'react';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  allTime: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  last90days: 'Last 90 Days',
  thisMonth: 'This Month',
};

export default function HRDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('last7days');
  const { data, isLoading } = useHRDashboard(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={4} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" />
      </div>
    );
  }


  const teamStats = data?.teamStats;
  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Custom Range';

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground shimmer-text">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track performance for each team member</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Range: {dateRangeLabel}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="animate-slide-up stagger-1">
          <KPICard title="Assigned Leads" value={teamStats?.totalLeads ?? 0} icon={Users} subtitle={dateRangeLabel} />
        </div>
        <div className="animate-slide-up stagger-2">
          <KPICard title="Calls Logged" value={teamStats?.totalCalls ?? 0} icon={PhoneCall} subtitle={dateRangeLabel} />
        </div>
        <div className="animate-slide-up stagger-3">
          <KPICard title="Meetings" value={teamStats?.totalMeetings ?? 0} icon={CalendarDays} subtitle={dateRangeLabel} />
        </div>
        <div className="animate-slide-up stagger-4">
          <KPICard title="Closed Won" value={teamStats?.closedWon ?? 0} icon={CheckCircle2} subtitle={dateRangeLabel} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-foreground">Member KPI View</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Open the dedicated page to see each team member's KPIs in a neutral, non-competitive view.
        </p>
        <div className="mt-4">
          <Link
            href="/hr/performance"
            className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            Open Member KPIs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
