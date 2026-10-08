'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Trash2, Edit2, UserCheck, CheckSquare, Square, ChevronDown,
  Loader2, X, Save, Users, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { usePaginatedLeads, useAgents, useDeleteLead, useUpdateLead, useBulkAssign, useBulkDelete } from '@/hooks/useApi';
import { LeadStatus } from '@/features/leads/types/leads';
import { useToast } from '@/hooks/use-toast';
import { STAGE_KEYS, PRIORITY_KEYS, getStageBadgeClass } from '@/features/leads/constants/pipeline';
import { AddLeadDialog } from '../components/AddLeadDialog';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const SOURCE_OPTIONS = ['CSV Import', 'Manual', 'Website', 'Referral', 'LinkedIn', 'Cold – High Fit', 'Warm – Engaged', 'Cold – Quick Sourced', 'Cold – Bulk Data', 'Other'];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

const SORT_OPTIONS = [
  { value: 'size-asc', label: 'Company Size: Small → Large' },
  { value: 'size-desc', label: 'Company Size: Large → Small' },
  { value: 'new-old', label: 'New → Old (Date Added)' },
  { value: 'old-new', label: 'Old → New (Date Added)' },
  { value: 'recent-updates', label: 'Recent Updates (Last Activity)' },
] as const;

type CompanySizeRange = 'all' | '1-10' | '11-50' | '51-200' | '201-500' | '500+';
type SortOption = typeof SORT_OPTIONS[number]['value'];

const getCompanySizeBounds = (range: CompanySizeRange): { min?: number; max?: number } | null => {
  if (range === '1-10') return { min: 1, max: 10 };
  if (range === '11-50') return { min: 11, max: 50 };
  if (range === '51-200') return { min: 51, max: 200 };
  if (range === '201-500') return { min: 201, max: 500 };
  if (range === '500+') return { min: 501 };
  return null;
};

interface EditForm {
  name: string;
  email: string;
  companyName: string;
  status: LeadStatus;
  assignedAgent: string;
  notes: string;
  title: string;
  city: string;
  state: string;
}

export default function LeadGenLeadsPage() {
  const { data: agents = [] } = useAgents();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  const bulkAssign = useBulkAssign();
  const bulkDelete = useBulkDelete();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'A' | 'B' | 'C' | 'all'>('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState<CompanySizeRange>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent-updates');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAgentName, setBulkAgentName] = useState('');
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', email: '', companyName: '', status: 'New Lead' as LeadStatus,
    assignedAgent: '', notes: '', title: '', city: '', state: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteByNumbersOpen, setDeleteByNumbersOpen] = useState(false);
  const [deleteNumbersInput, setDeleteNumbersInput] = useState('');

  const sdrs = useMemo(() => agents.filter((a: any) => a.role === 'sdr'), [agents]);

  const sizeBounds = useMemo(() => getCompanySizeBounds(sizeFilter), [sizeFilter]);
  const sortConfig = useMemo(() => {
    if (sortBy === 'size-asc') return { sortBy: 'employeeCount', sortOrder: 'asc' as const };
    if (sortBy === 'size-desc') return { sortBy: 'employeeCount', sortOrder: 'desc' as const };
    if (sortBy === 'old-new') return { sortBy: 'createdAt', sortOrder: 'asc' as const };
    if (sortBy === 'recent-updates') return { sortBy: 'updatedAt', sortOrder: 'desc' as const };
    return { sortBy: 'createdAt', sortOrder: 'desc' as const };
  }, [sortBy]);

  const { data: leadPage, isLoading } = usePaginatedLeads({
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    state: stateFilter === 'all' ? undefined : stateFilter,
    employeeCountMin: sizeBounds?.min,
    employeeCountMax: sizeBounds?.max,
    page,
    limit: pageSize,
    sortBy: sortConfig.sortBy,
    sortOrder: sortConfig.sortOrder,
  });

  const leads = leadPage?.leads ?? [];
  const totalLeads = leadPage?.pagination.total ?? 0;
  const totalPages = Math.max(1, leadPage?.pagination.pages ?? 1);
  const safePage = Math.min(leadPage?.pagination.page ?? page, totalPages);
  const pageRowStart = (safePage - 1) * pageSize + 1;
  const pageRowEnd = leads.length > 0 ? pageRowStart + leads.length - 1 : 0;

  const rowNumberToLeadId = useMemo(() => {
    return new Map(leads.map((lead: any, index: number) => [pageRowStart + index, lead.id]));
  }, [leads, pageRowStart]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, stateFilter, sizeFilter, sourceFilter, sortBy]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [safePage, debouncedSearch, statusFilter, priorityFilter, stateFilter, sizeFilter, sourceFilter, sortBy, pageSize]);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (stateFilter !== 'all' ? 1 : 0) +
    (sizeFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setStateFilter('all');
    setSizeFilter('all');
    setSourceFilter('all');
    setPage(1);
  };

  // --- Selection ---
  const allSelected = leads.length > 0 && leads.every((l: any) => selectedIds.has(l.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l: any) => l.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // --- Bulk Assign ---
  const handleBulkAssign = async () => {
    if (!bulkAgentName || selectedIds.size === 0) return;
    try {
      const assigneeName = sdrs.find((sdr: any) => sdr.id === bulkAgentName)?.name || bulkAgentName;
      const result = await bulkAssign.mutateAsync({ leadIds: Array.from(selectedIds), assignedTo: bulkAgentName });
      toast({ title: 'Bulk assignment complete', description: `${result.assigned} lead(s) assigned to ${assigneeName}.` });
      setSelectedIds(new Set());
      setBulkAgentName('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // --- Bulk Delete ---
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await bulkDelete.mutateAsync({ leadIds: Array.from(selectedIds) });
      toast({ title: 'Bulk deletion complete', description: `${result.deleted} lead(s) deleted.` });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteByNumbers = async () => {
    const rawTokens = deleteNumbersInput
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);

    if (rawTokens.length === 0) {
      toast({ title: 'Enter row numbers', description: 'Use numbers like 3,5,8-12 for rows on the current page.', variant: 'destructive' });
      return;
    }

    const requestedNumbers = new Set<number>();
    const invalidTokens: string[] = [];

    for (const token of rawTokens) {
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);

        if (start > end) {
          invalidTokens.push(token);
          continue;
        }

        for (let value = start; value <= end; value += 1) {
          requestedNumbers.add(value);
        }
        continue;
      }

      if (/^\d+$/.test(token)) {
        requestedNumbers.add(Number(token));
        continue;
      }

      invalidTokens.push(token);
    }

    if (invalidTokens.length > 0) {
      toast({ title: 'Invalid row numbers', description: `Could not parse: ${invalidTokens.join(', ')}`, variant: 'destructive' });
      return;
    }

    const matchedIds = Array.from(requestedNumbers)
      .map(number => rowNumberToLeadId.get(number))
      .filter((leadId): leadId is string => Boolean(leadId));

    const unmatchedNumbers = Array.from(requestedNumbers).filter(number => !rowNumberToLeadId.has(number));

    if (matchedIds.length === 0) {
      toast({ title: 'No matching rows', description: pageRowEnd > 0 ? `This page only shows rows ${pageRowStart}-${pageRowEnd}.` : 'There are no visible rows to delete.', variant: 'destructive' });
      return;
    }

    try {
      const result = await bulkDelete.mutateAsync({ leadIds: matchedIds });
      const unmatchedSuffix = unmatchedNumbers.length > 0 ? ` Ignored row numbers outside this page: ${unmatchedNumbers.join(', ')}.` : '';
      toast({ title: 'Specified deletion complete', description: `${result.deleted} lead(s) deleted.${unmatchedSuffix}` });
      setSelectedIds(new Set());
      setDeleteNumbersInput('');
      setDeleteByNumbersOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // --- Inline single assign ---
  const handleAssignOne = async (leadId: string, agentName: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, data: { assignedAgent: agentName } });
      toast({ title: 'Lead assigned', description: `Assigned to ${agentName || 'Unassigned'}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // --- Edit ---
  const openEdit = (lead: any) => {
    setEditingLead(lead);
    setEditForm({
      name: lead.name || '',
      email: lead.email || '',
      companyName: lead.companyName || '',
      status: lead.status || 'New Lead',
      assignedAgent: lead.assignedAgent || '',
      notes: lead.notes || '',
      title: lead.title || '',
      city: lead.city || '',
      state: lead.state || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      await updateLead.mutateAsync({ id: editingLead.id, data: editForm });
      toast({ title: 'Lead updated' });
      setEditingLead(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // --- Delete ---
  const handleDelete = async (id: string) => {
    try {
      await deleteLead.mutateAsync(id);
      toast({ title: 'Lead deleted' });
      setDeleteConfirmId(null);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <DashboardTableSkeleton rows={9} cols={8} />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Database</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalLeads} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteByNumbersOpen(true)}
            disabled={leads.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete By #
          </Button>
          <AddLeadDialog />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Results: {totalLeads}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Page: {safePage}/{totalPages}
        </span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Filters: {activeFilterCount}
          </span>
        )}
      </div>

      {/* Search + Filter + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, company..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 px-4"
            onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }}
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
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
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
                      onClick={() => { setPriorityFilter('all'); setPage(1); }}
                      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${priorityFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-secondary'}`}
                    >
                      All
                    </button>
                    {PRIORITY_KEYS.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPriorityFilter(p); setPage(1); }}
                        className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${priorityFilter === p ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-secondary'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Location (State)</label>
                  <select
                    value={stateFilter}
                    onChange={e => { setStateFilter(e.target.value); setPage(1); }}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">All States</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* Company Size */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Company Size</label>
                  <select
                    value={sizeFilter}
                    onChange={e => { setSizeFilter(e.target.value as CompanySizeRange); setPage(1); }}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">All Sizes</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Lead Source</label>
                  <select
                    value={sourceFilter}
                    onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="all">All Sources</option>
                    {SOURCE_OPTIONS.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 px-4"
            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort</span>
          </Button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <p className="text-sm font-semibold text-foreground">Sort By</p>
              </div>
              <div className="p-3 space-y-1">
                {SORT_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-secondary/40 cursor-pointer">
                    <input
                      type="radio"
                      name="sortOption"
                      value={option.value}
                      checked={sortBy === option.value}
                      onChange={() => { setSortBy(option.value); setPage(1); }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
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
          {stateFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              State: {stateFilter}
              <button onClick={() => setStateFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {sizeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Size: {sizeFilter}
              <button onClick={() => setSizeFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {sourceFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Source: {sourceFilter}
              <button onClick={() => setSourceFilter('all')} className="hover:text-primary/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Bulk assign bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} lead(s) selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkAgentName}
              onChange={e => setBulkAgentName(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">Select SDR to assign...</option>
              {sdrs.map((sdr: any) => (
                <option key={sdr.id} value={sdr.id}>{sdr.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="gradient-primary border-0"
              onClick={handleBulkAssign}
              disabled={!bulkAgentName || bulkAssign.isPending}
            >
              <UserCheck className="h-4 w-4 mr-1.5" />
              {bulkAssign.isPending ? 'Assigning...' : 'Assign'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left w-10">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Assigned To</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead: any, index: number) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedIds.has(lead.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(lead.id)} className="text-muted-foreground hover:text-foreground">
                        {selectedIds.has(lead.id)
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4" />
                        }
                      </button>
                    </td>
                    <td className="px-2 py-3 text-xs font-medium text-muted-foreground">{pageRowStart + index}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{lead.companyName || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{lead.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStageBadgeClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Inline assign dropdown */}
                      <select
                        value={lead.assignedAgent || ''}
                        onChange={e => handleAssignOne(lead.id, e.target.value)}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground max-w-[140px]"
                      >
                        <option value="">Unassigned</option>
                        {sdrs.map((sdr: any) => (
                          <option key={sdr.id} value={sdr.name}>{sdr.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(lead)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(lead.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-muted-foreground">
              Showing {totalLeads === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalLeads)} of {totalLeads} leads
            </p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Show
              <select
                value={pageSize}
                onChange={event => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                {PAGE_SIZE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              per page
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-sm font-medium text-foreground px-2">
              {safePage} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Edit Lead</h2>
              <button onClick={() => setEditingLead(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {([
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Title', key: 'title', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Company', key: 'companyName', type: 'text' },
                { label: 'City', key: 'city', type: 'text' },
                { label: 'State', key: 'state', type: 'text' },
              ] as { label: string; key: keyof EditForm; type: string }[]).map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={editForm[field.key] as string}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {STAGE_KEYS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assign to SDR</label>
                <select
                  value={editForm.assignedAgent}
                  onChange={e => setEditForm(prev => ({ ...prev, assignedAgent: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Unassigned</option>
                  {sdrs.map((sdr: any) => (
                    <option key={sdr.id} value={sdr.name}>{sdr.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditingLead(null)}>Cancel</Button>
              <Button
                className="gradient-primary border-0"
                onClick={handleSaveEdit}
                disabled={updateLead.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateLead.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-2">Delete Lead?</h2>
            <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteLead.isPending}
              >
                {deleteLead.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-2">Delete {selectedIds.size} Leads?</h2>
            <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. All selected leads and their associated data will be removed.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
              >
                {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete By Numbers Modal */}
      {deleteByNumbersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-2">Delete Specific Rows</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter visible row numbers from this page, like 3, 5, 8-12.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Current page range: {pageRowEnd > 0 ? `${pageRowStart}-${pageRowEnd}` : 'No rows visible'}
            </p>
            <input
              type="text"
              value={deleteNumbersInput}
              onChange={(event) => setDeleteNumbersInput(event.target.value)}
              placeholder={pageRowEnd > 0 ? `${pageRowStart}, ${pageRowStart + 1}, ${Math.min(pageRowStart + 4, pageRowEnd)}-${Math.min(pageRowStart + 8, pageRowEnd)}` : '3, 5, 8-12'}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground mb-6"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteByNumbersOpen(false);
                  setDeleteNumbersInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteByNumbers}
                disabled={bulkDelete.isPending}
              >
                {bulkDelete.isPending ? 'Deleting...' : 'Delete Rows'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
