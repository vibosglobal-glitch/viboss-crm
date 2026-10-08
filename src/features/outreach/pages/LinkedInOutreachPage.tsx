'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Linkedin, ExternalLink, Search, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { useLeads, useAgents } from '@/hooks/useApi';
import { PIPELINE_STAGES, PRIORITY_KEYS, STAGE_KEYS } from '@/features/leads/constants/pipeline';
import { LeadStatus } from '@/features/leads/types/leads';

export default function LinkedInOutreachPage() {
    const { data: leads = [], isLoading } = useLeads();
    const { data: agents = [] } = useAgents();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'A' | 'B' | 'C' | 'all'>('all');
    const [userFilter, setUserFilter] = useState('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const linkedInLeads = useMemo(() =>
        leads.filter((l: any) => l.personLinkedinUrl || l.companyLinkedinUrl)
            .filter((l: any) => {
                const q = search.toLowerCase();
                const matchSearch = !search || l.name?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q);
                const matchStatus = statusFilter === 'all' || l.status === statusFilter;
                const matchPriority = priorityFilter === 'all' || l.priority === priorityFilter;
                const matchUser = userFilter === 'all' || l.assignedAgent === userFilter || l.addedBy === userFilter;
                return matchSearch && matchStatus && matchPriority && matchUser;
            }),
        [leads, search, statusFilter, priorityFilter, userFilter]
    );

    const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (userFilter !== 'all' ? 1 : 0);
    const activeFilterLabel = activeFilterCount === 0 ? 'None' : `${activeFilterCount} active`;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-52" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex gap-3 items-center max-w-2xl">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <DashboardTableSkeleton rows={7} cols={4} />
            </div>
        );
    }

    return (
        <div className="space-y-5 md:space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">LinkedIn Outreach</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {linkedInLeads.length} leads with LinkedIn profiles (from {leads.length} total)
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    Results: {linkedInLeads.length}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    Filter: {activeFilterLabel}
                </span>
            </div>

            {/* Search + Filter Button */}
            <div className="flex gap-3 items-center max-w-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name or company..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                </div>

                {/* Filter dropdown */}
                <div className="relative" ref={filterRef}>
                    <Button
                        variant="outline"
                        size="sm"
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

                            <div className="p-4 space-y-4">
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
                                            <option key={agent.id} value={agent.name}>{agent.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
                                        className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                                    >
                                        <option value="all">All Statuses</option>
                                        {STAGE_KEYS.map(s => (
                                            <option key={s} value={s}>{s}</option>
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
                                                onClick={() => setPriorityFilter(p)}
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

            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                {linkedInLeads.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-sm">
                        No leads with LinkedIn URLs found.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {linkedInLeads.map((lead: any) => (
                            <div key={lead.id} className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077b5] text-white shrink-0">
                                            <Linkedin className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground truncate">{lead.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{lead.companyName || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="text-xs hidden sm:flex">{lead.status}</Badge>
                                        {lead.personLinkedinUrl && (
                                            <a
                                                href={lead.personLinkedinUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                                            >
                                                <Linkedin className="h-3.5 w-3.5 text-[#0077b5]" />
                                                Profile
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                        {lead.companyLinkedinUrl && (
                                            <a
                                                href={lead.companyLinkedinUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                                            >
                                                <Linkedin className="h-3.5 w-3.5 text-[#0077b5]" />
                                                Company
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                                        >
                                            {expandedId === lead.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            {expandedId === lead.id ? 'Less' : 'More info'}
                                        </Button>
                                    </div>
                                </div>

                                {expandedId === lead.id && (
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-muted/30 rounded-lg p-4">
                                        {[
                                            { label: 'Title', value: lead.title },
                                            { label: 'Email', value: lead.email },
                                            { label: 'Phone', value: lead.phone || lead.workDirectPhone },
                                            { label: 'City', value: lead.city },
                                            { label: 'State', value: lead.state },
                                            { label: 'Employees', value: lead.employeeCount },
                                            { label: 'Status', value: lead.status },
                                            { label: 'Assigned to', value: lead.assignedAgent || 'Unassigned' },
                                            { label: 'Source', value: lead.source },
                                        ].map(row => (
                                            <div key={row.label}>
                                                <span className="text-xs text-muted-foreground block">{row.label}</span>
                                                <span className="font-medium text-foreground">{row.value || '—'}</span>
                                            </div>
                                        ))}
                                        {lead.notes && (
                                            <div className="col-span-full">
                                                <span className="text-xs text-muted-foreground block">Notes</span>
                                                <span className="text-foreground">{lead.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
