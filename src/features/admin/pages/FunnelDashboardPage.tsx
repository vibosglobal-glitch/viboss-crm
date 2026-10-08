'use client';
import { useFunnel } from '@/hooks/useApi';
import { CheckCircle2, DollarSign, Users, Award, Target } from 'lucide-react';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import DateFilter, { DateRange } from '@/components/common/DateFilter';
import { useState, useMemo } from 'react';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  allTime: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  last90days: 'Last 90 Days',
  thisMonth: 'This Month',
};

function dateRangeToParams(dateRange: DateRange): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  if (dateRange === 'allTime') return {};

  switch (dateRange) {
    case 'today':
      return { dateFrom: toISO(todayStart) };
    case 'yesterday': {
      const y = new Date(todayStart);
      y.setDate(y.getDate() - 1);
      return { dateFrom: toISO(y), dateTo: toISO(y) };
    }
    case 'last7days': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 6);
      return { dateFrom: toISO(s) };
    }
    case 'last30days': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 29);
      return { dateFrom: toISO(s) };
    }
    case 'last90days': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 89);
      return { dateFrom: toISO(s) };
    }
    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toISO(s) };
    }
    default:
      return {};
  }
}

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: any; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent || 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-white' : 'text-primary'}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function FunnelDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('last7days');
  const funnelParams = useMemo(() => dateRangeToParams(dateRange), [dateRange]);
  const { data: funnel, isLoading } = useFunnel(funnelParams);

  if (isLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={4} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" />
        <DashboardTableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  const byAgent: { name: string; total: number; closedWon: number; meetings: number }[] = funnel?.byAgent || [];
  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Custom Range';

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funnel Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">End-to-end pipeline health metrics</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Range: {dateRangeLabel}
        </span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={funnel?.totalLeads ?? 0}
          icon={Target}
          sub="in pipeline"
        />
        <StatCard
          label="Closed Won"
          value={funnel?.closedWon ?? 0}
          sub="closed deals"
          icon={CheckCircle2}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Total Revenue"
          value={`$${((funnel?.totalRevenue ?? 0) / 1000).toFixed(1)}k`}
          sub="from closed deals"
          icon={DollarSign}
          accent="bg-primary"
        />
        <StatCard
          label="Avg Days (New)"
          value={funnel?.avgDaysNew ?? 0}
          sub="days since created"
          icon={Users}
        />
      </div>



      {/* Per-agent leaderboard */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Agent Leaderboard</h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
                <th className="sticky top-0 text-left py-2.5 pr-4 pl-3 text-muted-foreground font-medium">Agent</th>
                <th className="sticky top-0 text-center py-2.5 px-3 text-muted-foreground font-medium">Total</th>
                <th className="sticky top-0 text-center py-2.5 px-3 text-muted-foreground font-medium">Meetings</th>
                <th className="sticky top-0 text-center py-2.5 px-3 text-muted-foreground font-medium">Closed Won</th>
              </tr>
            </thead>
            <tbody>
              {byAgent.map((agent, i) => {
                return (
                  <tr key={agent.name} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-3 pr-4 pl-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="text-amber-500 text-base">🥇</span>}
                        {i === 1 && <span className="text-slate-400 text-base">🥈</span>}
                        {i === 2 && <span className="text-orange-400 text-base">🥉</span>}
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-foreground">{agent.total}</td>
                    <td className="py-3 px-3 text-center text-foreground">{agent.meetings}</td>
                    <td className="py-3 px-3 text-center text-emerald-600 font-semibold">{agent.closedWon}</td>
                  </tr>
                );
              })}
              {byAgent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No data yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
