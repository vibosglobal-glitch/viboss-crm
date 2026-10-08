'use client';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Phone,
  Target,
  TrendingUp,
  Calendar,
  BarChart2,
  Coffee,
} from 'lucide-react';
import KPICard from '@/components/common/KPICard';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton } from '@/components/common/DashboardSkeletons';
import RecentActivityFeed from '@/components/common/RecentActivityFeed';
import { useAgents, useKPIs, useCalls, useLeads } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import DateFilter, { DateRange, filterByDateRange } from '@/components/common/DateFilter';
import { ActiveAccountsListModal } from '../../leads/components/ActiveAccountsListModal';
import { getLeadActivityDate } from '@/features/leads/utils/status';
import dynamic from 'next/dynamic';
import { motion, Variants } from 'framer-motion';

const DailyActivityChart = dynamic(
  () => import('../components/DailyActivityChart').then(m => ({ default: m.DailyActivityChart })),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-muted animate-pulse" /> }
);
const AgentPerformanceGrid = dynamic(
  () => import('../components/AgentPerformanceGrid').then(m => ({ default: m.AgentPerformanceGrid })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-muted animate-pulse" /> }
);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.02 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
};

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

function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalDateKey(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatLocalDateKey(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const usDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usDateMatch) {
      const p = new Date(Number(usDateMatch[3]), Number(usDateMatch[1]) - 1, Number(usDateMatch[2]));
      if (!Number.isNaN(p.getTime())) return formatLocalDateKey(p);
    }
  }
  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatLocalDateKey(parsed);
}

export default function AdminDashboard() {
  const { data: leads = [] } = useLeads();
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: allCalls = [] } = useCalls();
  const router = useRouter();

  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('last30days');
  const [isActiveAccountsModalOpen, setIsActiveAccountsModalOpen] = useState(false);

  const kpiParams = useMemo(() => dateRangeToParams(dateRange), [dateRange]);
  const { data: kpis, isLoading: kpisLoading } = useKPIs(kpiParams);

  const filteredLeads = useMemo(
    () => filterByDateRange(leads, dateRange, getLeadActivityDate),
    [leads, dateRange]
  );

  // Chart data: filter by selected user
  const [chartLeads, chartCalls] = useMemo(() => [
    selectedUser === 'all' ? leads : leads.filter((l: any) => (l.assignedTo?.name || l.assignedAgent) === selectedUser),
    selectedUser === 'all' ? allCalls : allCalls.filter((c: any) => c.agentName === selectedUser),
  ], [leads, allCalls, selectedUser]);

  const chartDays = dateRange === 'today' ? 1
    : dateRange === 'yesterday' ? 1
    : dateRange === 'last7days' ? 7
    : dateRange === 'last30days' ? 30
    : dateRange === 'last90days' ? 90
    : dateRange === 'thisMonth' ? new Date().getDate()
    : 30;
  const chartEndOffsetDays = dateRange === 'yesterday' ? 1 : 0;

  const chartData = useMemo(() => {
    const leadCountsByDate = chartLeads.reduce((acc: Record<string, number>, lead: any) => {
      const key = toLocalDateKey(getLeadActivityDate(lead));
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const callCountsByDate = chartCalls.reduce((acc: Record<string, number>, call: any) => {
      const key = toLocalDateKey(call.occurredAt || call.date);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: chartDays }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (chartDays - 1 - i + chartEndOffsetDays));
      const dateKey = formatLocalDateKey(date);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        leads: leadCountsByDate[dateKey] || 0,
        calls: callCountsByDate[dateKey] || 0,
        total: (leadCountsByDate[dateKey] || 0) + (callCountsByDate[dateKey] || 0),
      };
    });
  }, [chartLeads, chartCalls, chartDays, chartEndOffsetDays]);

  if (kpisLoading || agentsLoading) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={5} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-6 w-44 mb-4" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </div>
    );
  }

  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] ?? 'Custom Range';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of all team activity</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* Range badge */}
      <motion.div variants={itemVariants}>
        <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary/80">
          Range: {dateRangeLabel}
        </span>
        {selectedUser !== 'all' && (
          <button
            onClick={() => setSelectedUser('all')}
            className="ml-2 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/15 transition-all"
          >
            Member: {selectedUser} · Reset
          </button>
        )}
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        <KPICard
          title="New Leads"
          value={kpis?.newLeads ?? 0}
          icon={UserPlus}
          subtitle={dateRangeLabel}
          variant="default"
          link="/admin/leads?status=New+Lead"
        />
        <KPICard
          title="Contacted"
          value={kpis?.contacted ?? 0}
          icon={Phone}
          subtitle={dateRangeLabel}
          variant="default"
          link="/admin/leads?status=Contacted"
        />
        <KPICard
          title="In Progress"
          value={kpis?.inProgress ?? 0}
          icon={TrendingUp}
          subtitle={dateRangeLabel}
          variant="default"
          link="/admin/leads?status=In+Progress"
        />
        <KPICard
          title="Appointment Set"
          value={kpis?.appointmentSet ?? 0}
          icon={Calendar}
          subtitle={dateRangeLabel}
          variant="success"
          link="/admin/leads?status=Appointment+Set"
        />
        <KPICard
          title="Active Accounts"
          value={kpis?.activeAccount ?? 0}
          icon={Target}
          subtitle={dateRangeLabel}
          variant="success"
          onClick={() => setIsActiveAccountsModalOpen(true)}
        />
      </motion.div>

      {/* Quick panels */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-sm hover:bg-secondary/40 hover:border-primary/20 transition-all group"
          onClick={() => router.push('/admin/team')}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <Coffee className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Daily Huddle</p>
            <p className="text-xs text-muted-foreground">Team activity snapshot</p>
          </div>
        </button>
        <button
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-sm hover:bg-secondary/40 hover:border-primary/20 transition-all group"
          onClick={() => router.push('/admin/pipeline')}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Funnel KPIs</p>
            <p className="text-xs text-muted-foreground">Pipeline conversion metrics</p>
          </div>
        </button>
      </motion.div>

      {/* Team Overview */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Team Overview</h2>
          <button
            onClick={() => router.push('/admin/team')}
            className="text-sm font-medium text-primary hover:underline underline-offset-2 transition-all"
          >
            Manage Team →
          </button>
        </div>
        <AgentPerformanceGrid agents={agents} />
      </motion.section>

      {/* Recent Activity */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Latest team updates</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <RecentActivityFeed />
      </motion.section>

      {/* Daily Activity Chart */}
      <motion.section variants={itemVariants}>
        <DailyActivityChart
          data={chartData}
          agents={agents}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
        />
      </motion.section>

      <ActiveAccountsListModal
        isOpen={isActiveAccountsModalOpen}
        onClose={() => setIsActiveAccountsModalOpen(false)}
        leads={filteredLeads}
      />
    </motion.div>
  );
}
