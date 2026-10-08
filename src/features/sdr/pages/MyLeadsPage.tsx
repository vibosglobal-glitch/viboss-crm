'use client';
import { usePaginatedLeads, useDeleteLead, useBulkDelete, useAgents, useBulkAssign } from '@/hooks/useApi';
import LeadTable from '@/components/common/LeadTable';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Loader2, SlidersHorizontal, X, ArrowUpDown, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import Link from 'next/link';
import { LeadStatus } from '@/features/leads/types/leads';
import { STAGE_KEYS, PRIORITY_KEYS } from '@/features/leads/constants/pipeline';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const STATUS_OPTIONS = ['New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account'] as const;
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

export default function MyLeadsPage() {
  const deleteLead = useDeleteLead();
  const bulkDelete = useBulkDelete();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<'all' | typeof STATUS_OPTIONS[number]>('all');
  const [priorityFilter, setPriorityFilter] = useState<'A' | 'B' | 'C' | 'all'>('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState<CompanySizeRange>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent-updates');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [assigningTo, setAssigningTo] = useState<string>('');
  const { data: agents = [] } = useAgents();
  const bulkAssign = useBulkAssign();

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, stateFilter, sizeFilter, sourceFilter, sortBy]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds([]);
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

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(leads.map((l: any) => l.id || l._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLead.mutateAsync(id);
      toast.success('Lead deleted');
      setDeleteConfirmId(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDelete.mutateAsync({ leadIds: selectedIds });
      toast.success(`${selectedIds.length} lead(s) deleted`);
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
    } catch {
      toast.error('Failed to delete leads');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <DashboardTableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalLeads} leads available to you</p>
        </div>
        <Link href="/sdr/upload">
          <Button size="sm" className="gap-2 shadow-sm font-medium">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
        </Link>
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
            placeholder="Search by name, phone, or email..."
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
                    {STATUS_OPTIONS.map(s => (
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

      <LeadTable
        leads={leads}
        startIndex={(safePage - 1) * pageSize}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onDelete={(id) => setDeleteConfirmId(id)}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {totalLeads === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalLeads)} of {totalLeads}
          </p>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
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

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-elevated rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-semibold text-primary">{selectedIds.length} selected</span>
          <div className="h-6 w-px bg-border"></div>
          
          <div className="flex items-center gap-2 border-r border-border pr-4">
            <select
              title="Assign to Agent"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={assigningTo}
              onChange={(e) => setAssigningTo(e.target.value)}
            >
              <option value="">Assign to...</option>
              <option value="unassigned">Unassigned</option>
              {agents.filter((a: any) => a.role === 'sdr').map((agent: any) => (
                <option key={agent.id || agent._id} value={agent.id || agent._id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <Button 
              size="sm" 
              variant="secondary"
              disabled={!assigningTo || bulkAssign.isPending}
              onClick={async () => {
                if (!assigningTo || selectedIds.length === 0) return;
                try {
                  const assignedTo = assigningTo === 'unassigned' ? 'unassigned' : assigningTo;
                  await bulkAssign.mutateAsync({ leadIds: selectedIds, assignedTo });
                  toast.success(`Assigned ${selectedIds.length} lead(s)`);
                  setSelectedIds([]);
                  setAssigningTo('');
                } catch {
                  toast.error('Failed to assign leads');
                }
              }}
            >
              Assign
            </Button>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteConfirm(true)}
            disabled={bulkDelete.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
        </div>
      )}

      {/* Single Delete Confirm Modal */}
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
            <h2 className="text-base font-semibold text-foreground mb-2">Delete {selectedIds.length} Leads?</h2>
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
    </div>
  );
}
