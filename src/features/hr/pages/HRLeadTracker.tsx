'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHRLeads, useAgents } from '@/hooks/useApi';
import { Search, Users, UserPlus, Phone, CheckCircle2, Loader2, Calendar, Building2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/common/KPICard';
import { PIPELINE_STAGES, getStageBadgeClass, TERMINAL_STAGES, PRIORITY_KEYS } from '@/features/leads/constants/pipeline';
import { matchesLeadStatus } from '@/features/leads/utils/status';

export default function HRLeadTracker() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const { data: agents = [] } = useAgents();
  const [priorityFilter, setPriorityFilter] = useState<'A' | 'B' | 'C' | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: apiLeads = [], isLoading } = useHRLeads({
    status: statusFilter,
    search: search || undefined,
    assignedTo: userFilter === 'all' ? undefined : userFilter,
  });

  const leads = useMemo(() => {
    if (priorityFilter === 'all') return apiLeads;
    return apiLeads.filter((l: any) => l.priority === priorityFilter);
  }, [apiLeads, priorityFilter]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (userFilter !== 'all' ? 1 : 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const closedCount = leads.filter((l: any) => matchesLeadStatus(l.status, 'Active Account')).length;
  const activeCount = leads.filter((l: any) => !TERMINAL_STAGES.includes(l.status)).length;

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground shimmer-text">Lead Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">See who added each lead, who called them, and who closed them</p>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-slide-up stagger-1">
          <KPICard title="Total Leads" value={leads.length} icon={Users} />
        </div>
        <div className="animate-slide-up stagger-2">
          <KPICard title="Active" value={activeCount} icon={UserPlus} />
        </div>
        <div className="animate-slide-up stagger-3">
          <KPICard title="Closed" value={closedCount} icon={CheckCircle2} variant="success" />
        </div>
        <div className="animate-slide-up stagger-4">
          <KPICard title="Total Calls" value={leads.reduce((s: number, l: any) => s + (l.callCount || 0), 0)} icon={Phone} />
        </div>
      </div>

      {/* Filters */}
      {/* Search + Filter Button */}
      <div className="flex gap-3 items-center animate-slide-up stagger-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads, agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            className="h-10 gap-2 px-4"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Filters</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setUserFilter('all'); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4 text-left">
                {/* User */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Team Member</label>
                  <select
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">All Users</option>
                    {agents.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Priority</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPriorityFilter('all')}
                      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${priorityFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-secondary'}`}
                    >
                      All
                    </button>
                    {PRIORITY_KEYS.map(p => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p as any)}
                        className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${priorityFilter === p ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-secondary'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex gap-2 flex-wrap">
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {priorityFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Priority: {priorityFilter}
              <button onClick={() => setPriorityFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {userFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              User: {userFilter}
              <button onClick={() => setUserFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-xl border border-border bg-card shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Database ({leads.length})</h2>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No leads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold text-muted-foreground">Lead Name</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Company</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" />Added By</div>
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">Assigned To</th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Called By</div>
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Closed By</div>
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground text-center">Calls</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: any, idx: number) => (
                  <tr
                    key={lead.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{lead.companyName || '—'}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className={getStageBadgeClass(lead.status)}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {lead.uploadedBy ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          <UserPlus className="h-3 w-3" />
                          {lead.uploadedBy.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-medium">{lead.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="py-3">
                      {lead.callAgents && lead.callAgents.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.callAgents.map((agent: string) => (
                            <span
                              key={agent}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                            >
                              <Phone className="h-3 w-3" />
                              {agent}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No calls</span>
                      )}
                    </td>
                    <td className="py-3">
                      {matchesLeadStatus(lead.status, 'Active Account') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {lead.assignedTo?.name || '—'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 text-center font-medium">{lead.callCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedLead?.firstName} {selectedLead?.lastName} — Lead Details
            </DialogTitle>
          </DialogHeader>
          {selectedLead && <LeadDetailContent lead={selectedLead} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadDetailContent({ lead }: { lead: any }) {
  return (

    <div className="space-y-6">
      {/* Lead Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Name" value={`${lead.firstName} ${lead.lastName}`} />
          <InfoRow label="Email" value={lead.email} />
          <InfoRow label="Company" value={lead.companyName} />
          <InfoRow label="Phone" value={lead.phone} />
          <InfoRow label="City" value={lead.city} />
          <InfoRow label="State" value={lead.state} />
          <InfoRow label="Source" value={lead.source} />
          <InfoRow label="Status" value={lead.status} />
          <InfoRow label="Assigned To" value={lead.assignedTo?.name} />
          {lead.wonDate && <InfoRow label="Closed Date" value={new Date(lead.wonDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />}
        </div>
      </div>

      {/* Attribution */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Attribution</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-blue-50/50 p-3 text-center">
            <UserPlus className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Uploaded By</p>
            <p className="text-sm font-medium">{lead.uploadedBy?.name || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-violet-50/50 p-3 text-center">
            <Phone className="h-4 w-4 text-violet-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Called By</p>
            <p className="text-sm font-medium">{lead.callAgents?.join(', ') || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-emerald-50/50 p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <p className="text-sm font-medium">{lead.assignedTo?.name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Call History */}
      {lead.callHistory?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Call History ({lead.callHistory.length})</h3>
          <div className="space-y-2">
            {lead.callHistory.map((call: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted/30 transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{call.userId?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(call.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  Completed
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {lead.activities?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Activity Log</h3>
          <div className="space-y-2">
            {lead.activities.map((act: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted/30 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground">{act.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {act.agent} · {act.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
