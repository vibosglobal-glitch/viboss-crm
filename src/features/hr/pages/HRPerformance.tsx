'use client';
import { useMemo, useState } from 'react';
import { Users, PhoneCall, CalendarDays, CheckCircle2, Activity, Target } from 'lucide-react';
import DateFilter, { DateRange } from '@/components/common/DateFilter';
import { Badge } from '@/components/ui/badge';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton } from '@/components/common/DashboardSkeletons';
import { useHRDashboard } from '@/hooks/useApi';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  allTime: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  last90days: 'Last 90 Days',
  thisMonth: 'This Month',
};

export default function HRPerformance() {
  const [dateRange, setDateRange] = useState<DateRange>('last7days');
  const { data, isLoading } = useHRDashboard(dateRange);

  const memberStats = useMemo(() => {
    const stats = data?.agentStats || [];
    return [...stats].sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.agentStats]);

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={6} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" />
      </div>
    );
  }

  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Custom Range';

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground shimmer-text">Member KPIs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-member KPI tracking only. No ranking or competitive comparison.
          </p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Range: {dateRangeLabel}
        </span>
      </div>

      {memberStats.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-8 text-center text-sm text-muted-foreground">
          No member KPI data available for this period.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
          {memberStats.map((member, idx) => (
            <div
              key={member.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card animate-slide-up flex flex-col hover:shadow-[0_8px_24px_hsl(var(--primary)/0.08)] transition-shadow"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {(member.role || 'agent').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center mt-auto">
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Leads
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.totalLeads}</p>
                </div>
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <PhoneCall className="h-3.5 w-3.5" /> Calls
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.totalCalls}</p>
                </div>
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> Meetings
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.totalMeetings}</p>
                </div>
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.closedWon}</p>
                </div>
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" /> Activities
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.totalActivities}</p>
                </div>
                <div className="rounded-md bg-secondary/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5" /> Appointments
                  </div>
                  <p className="text-lg font-bold text-foreground">{member.appointmentSet}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
