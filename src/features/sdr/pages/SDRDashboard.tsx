'use client';
import { Users, Phone, AlertTriangle, CalendarCheck, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/common/KPICard';
import { DashboardHeaderSkeleton, DashboardKpiGridSkeleton, DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import LeadTable from '@/components/common/LeadTable';
import { useLeads, useCalls } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMyTasks } from '@/features/activities/hooks/useActivities';
import DateFilter, { DateRange, filterByDateRange } from '@/components/common/DateFilter';
import { useState } from 'react';
import { ActiveAccountsListModal } from '../../leads/components/ActiveAccountsListModal';
import { format } from 'date-fns';
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

export default function SDRDashboard() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: tasks = [], isLoading: tasksLoading } = useMyTasks();
  const { data: allCalls = [] } = useCalls();
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>('last7days');
  const [isActiveAccountsModalOpen, setIsActiveAccountsModalOpen] = useState(false);

  const filteredLeads = filterByDateRange(leads, dateRange, getLeadActivityDate);

  const today = new Date();

  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);

  const newLeadsCount = countLeadsByStatus(filteredLeads, 'New Lead');
  const inProgressCount = filteredLeads.filter((l: any) => l.status === 'In Progress' || l.nextFollowUp).length;
  const contactedLeadsCount = countLeadsByStatus(filteredLeads, 'Contacted');
  const appointmentSetCount = countLeadsByStatus(filteredLeads, 'Appointment Set');
  const activeAccountCount = countLeadsByStatus(filteredLeads, 'Active Account');
  const callsMadeCount = allCalls.filter((c: any) => c.agentName === user?.name).length;

  const isLoadingAll = leadsLoading || tasksLoading;
  if (isLoadingAll) {
    return (
      <div className="space-y-5 md:space-y-6">
        <DashboardHeaderSkeleton />
        <DashboardKpiGridSkeleton count={5} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4" />
        <DashboardTableSkeleton rows={5} cols={3} />
        <DashboardTableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Custom Range';

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal performance overview</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Range: {dateRangeLabel}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="animate-slide-up stagger-1">
          <KPICard title="New Leads" value={newLeadsCount + inProgressCount} icon={Users} subtitle={dateRangeLabel} link="/sdr/leads" />
        </div>
        <div className="animate-slide-up stagger-2">
          <KPICard title="Calls Made" value={callsMadeCount} icon={Phone} subtitle={dateRangeLabel} link="/sdr/calls" />
        </div>
        <div className="animate-slide-up stagger-3">
          <KPICard title="Contacted" value={contactedLeadsCount} icon={CalendarCheck} subtitle={dateRangeLabel} link="/sdr/leads" />
        </div>
        <div className="animate-slide-up stagger-4">
          <KPICard title="Appointment Set" value={appointmentSetCount} icon={AlertTriangle} subtitle={dateRangeLabel} link="/sdr/meetings" />
        </div>
        <div className="animate-slide-up stagger-5">
          <KPICard title="Active Accounts" value={activeAccountCount} icon={CheckCircle} subtitle={dateRangeLabel} onClick={() => setIsActiveAccountsModalOpen(true)} />
        </div>
      </div>

      {/* Today's Tasks (Manual Follow-ups) */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Pending Tasks</h2>
          <span className="text-sm text-muted-foreground">{pendingTasks.length} to do</span>
        </div>
        <div className="space-y-3">
          {pendingTasks
            .sort((a: any, b: any) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
            .slice(0, 10)
            .map((task: any) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < today;
              return (
                <div key={task._id} className="flex flex-col gap-3 py-2 border-b border-border last:border-0 hover:bg-secondary/20 px-2 rounded transition-colors group sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${isOverdue ? 'bg-destructive' : 'bg-warning'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.leadId?.firstName} {task.leadId?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col-reverse items-start gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                    <div className="text-left sm:text-right sm:mr-4">
                      {task.dueDate && (
                        <p className={`text-xs font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {isOverdue ? 'Overdue' : 'Due'}: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </p>
                      )}
                      <p className="text-xs uppercase text-muted-foreground">{task.type}</p>
                    </div>
                    {task.leadId && (
                      <Link href={`/sdr/leads/${task.leadId._id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 group-hover:border-primary group-hover:text-primary transition-colors">
                          Execute <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          {pendingTasks.length === 0 && (
            <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
              <CheckCircle className="h-8 w-8 text-success mb-2 opacity-50" />
              <p>All tasks up to date! Great job.</p>
            </div>
          )}
        </div>
      </div>

      {/* My Leads Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Recent Leads</h2>
          <span className="text-sm text-muted-foreground">{leads.length} total</span>
        </div>
        <LeadTable leads={leads.slice(0, 10)} />
      </div>

      <ActiveAccountsListModal
        isOpen={isActiveAccountsModalOpen}
        onClose={() => setIsActiveAccountsModalOpen(false)}
        leads={filteredLeads}
      />
    </div>
  );
}
