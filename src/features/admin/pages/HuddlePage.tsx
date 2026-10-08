'use client';

import { useLeads, useAgents, useMeetings, useKPIs } from '@/hooks/useApi';
import { Loader2, CalendarCheck, AlertTriangle, Users, TrendingUp, Clock, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStageBadgeClass } from '@/features/leads/constants/pipeline';

export default function HuddlePage() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: meetings = [] } = useMeetings();
  const { data: kpis } = useKPIs();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Today's meetings
  const todayMeetings = meetings.filter((m: any) => m.date === todayStr);

  // Overdue follow-ups
  const overdueLeads = leads.filter((l: any) =>
    l.nextFollowUp && l.nextFollowUp < todayStr && l.status !== 'Closed Won' && l.status !== 'Closed Lost'
  );

  // Stuck in "New Lead" > 7 days
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const stuckLeads = leads.filter((l: any) => l.status === 'New Lead' && l.date < sevenDaysAgo);

  // Today's activity — leads updated today
  const activeToday = leads.filter((l: any) => l.lastActivity === todayStr);

  // Per-agent quick stats
  const agentStats = agents
    .filter((a: any) => a.role === 'sdr')
    .map((a: any) => {
      const myLeads = leads.filter((l: any) => l.assignedAgent === a.name);
      const myOverdue = myLeads.filter((l: any) => l.nextFollowUp && l.nextFollowUp < todayStr && l.status !== 'Closed Won' && l.status !== 'Closed Lost');
      const myActive = myLeads.filter((l: any) => l.lastActivity === todayStr);
      return { ...a, myLeads: myLeads.length, myOverdue: myOverdue.length, myActive: myActive.length };
    });

  if (leadsLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Huddle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Pulse row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today's Meetings", value: todayMeetings.length, icon: CalendarCheck, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Overdue Follow-ups', value: overdueLeads.length, icon: AlertTriangle, color: overdueLeads.length > 0 ? 'text-destructive' : 'text-muted-foreground', bg: overdueLeads.length > 0 ? 'bg-destructive/10' : 'bg-secondary/50' },
          { label: 'Active Today', value: activeToday.length, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Pending Leads', value: stuckLeads.length, icon: Clock, color: stuckLeads.length > 5 ? 'text-amber-600' : 'text-muted-foreground', bg: 'bg-secondary/50' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's meetings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Meetings Today</h2>
            <Badge variant="secondary" className="ml-auto">{todayMeetings.length}</Badge>
          </div>
          {todayMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No meetings scheduled today</p>
          ) : (
            <div className="space-y-2.5">
              {todayMeetings.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {m.time?.slice(0, 5) || '--'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    {m.leadName && <p className="text-xs text-muted-foreground">{m.leadName}</p>}
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto shrink-0 text-xs ${m.status === 'completed' ? 'border-emerald-200 text-emerald-700' : m.status === 'cancelled' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'}`}
                  >
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue follow-ups */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-base font-semibold text-foreground">Overdue Follow-ups</h2>
            <Badge variant={overdueLeads.length > 0 ? 'destructive' : 'secondary'} className="ml-auto">{overdueLeads.length}</Badge>
          </div>
          {overdueLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">All follow-ups are on track!</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {overdueLeads.slice(0, 10).map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-destructive/5 border border-destructive/10 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.assignedAgent} · due {l.nextFollowUp}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${getStageBadgeClass(l.status)}`}>
                    {l.status}
                  </span>
                </div>
              ))}
              {overdueLeads.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-1">+{overdueLeads.length - 10} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team Scorecard */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Team Scorecard — Today</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">SDR</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">Assigned</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">Active Today</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">Overdue</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map((a: any) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                        {a.avatar}
                      </div>
                      <span className="font-medium text-foreground">{a.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium">{a.myLeads}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={a.myActive > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>{a.myActive}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={a.myOverdue > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>{a.myOverdue}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {a.myOverdue === 0 && a.myActive > 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">On Track</Badge>
                    ) : a.myOverdue > 0 ? (
                      <Badge variant="destructive" className="text-xs">Needs Attention</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">No Activity</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {agentStats.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">No SDR agents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending leads */}
      {stuckLeads.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold text-amber-800 dark:text-amber-300">Pending Leads &gt; 7 days</h2>
            <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 text-xs">{stuckLeads.length}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {stuckLeads.slice(0, 6).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-black/20 border border-amber-200/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.assignedAgent} · since {l.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
