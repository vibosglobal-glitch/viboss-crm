'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpDown, Loader2, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { usePaginatedLeads, useAgents, useBulkAssign, useDeleteLead, useBulkDelete } from '@/hooks/useApi';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import LeadTable from '@/components/common/LeadTable';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const SOURCE_OPTIONS = [
  { value: 'csv_upload', label: 'CSV Import' },
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Other' },
] as const;

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

const STATUS_OPTIONS = ['New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account'] as const;

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

const matchesStatus = (rawStatus?: string, filter?: string) => {
  if (!filter || filter === 'all') {
    return true;
  }
  if (!rawStatus) {
    return false;
  }

  const status = rawStatus.trim().toLowerCase();
  const normalizedFilter = filter.toLowerCase();

  if (normalizedFilter === 'in progress') {
    return status === 'in progress' || status === 'working';
  }
  if (normalizedFilter === 'contacted') {
    return status === 'contacted' || status === 'connected';
  }
  if (normalizedFilter === 'appointment set') {
    return status === 'appointment set' || status === 'meeting booked';
  }
  if (normalizedFilter === 'active account') {
    return status === 'active account' || status === 'closed won' || status === 'active account (closed won)';
  }

  return status === normalizedFilter;
};

const inCompanySizeRange = (employeeCount: number | null | undefined, range: CompanySizeRange) => {
  if (range === 'all') {
    return true;
  }
  if (employeeCount === null || employeeCount === undefined) {
    return false;
  }

  if (range === '1-10') return employeeCount >= 1 && employeeCount <= 10;
  if (range === '11-50') return employeeCount >= 11 && employeeCount <= 50;
  if (range === '51-200') return employeeCount >= 51 && employeeCount <= 200;
  if (range === '201-500') return employeeCount >= 201 && employeeCount <= 500;
  if (range === '500+') return employeeCount > 500;
  return true;
};

export default function LeadsPage() {
  const { data: agents = [] } = useAgents();
  const deleteLead = useDeleteLead();
  const bulkDelete = useBulkDelete();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [stateFilter, setStateFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState<CompanySizeRange>('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const initialStatus = searchParams?.get('status') ?? '';
  const [statusFilter, setStatusFilter] = useState<'all' | typeof STATUS_OPTIONS[number]>(
    (STATUS_OPTIONS as readonly string[]).includes(initialStatus)
      ? (initialStatus as typeof STATUS_OPTIONS[number])
      : 'all'
  );
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent-updates');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assigningTo, setAssigningTo] = useState<string>('');
  const bulkAssign = useBulkAssign();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

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
    assignedTo: ownerFilter === 'all' ? undefined : ownerFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
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
  const totalPages = leadPage?.pagination.pages ?? 1;
  const safePage = Math.min(page, Math.max(1, totalPages));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset selection when filters change (but keep across pages)
  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, stateFilter, sizeFilter, ownerFilter, statusFilter, sourceFilter, sortBy, pageSize]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const activeFilterCount =
    (stateFilter !== 'all' ? 1 : 0) +
    (sizeFilter !== 'all' ? 1 : 0) +
    (ownerFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStateFilter('all');
    setSizeFilter('all');
    setOwnerFilter('all');
    setStatusFilter('all');
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
    if (!leadPage?.leads) return;
    
    const pageIds: string[] = (leadPage.leads as any[])
      .map(l => (l.id || l._id) as string)
      .filter(id => typeof id === 'string' && id.length > 0);
      
    if (selected) {
      setSelectedIds(prev => {
        const next = [...prev];
        pageIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    } else {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleBulkAssign = async () => {
    if (!assigningTo || selectedIds.length === 0) return;
    try {
      await bulkAssign.mutateAsync({ leadIds: selectedIds, assignedTo: assigningTo });
      toast.success(`${selectedIds.length} leads successfully assigned.`);
      setSelectedIds([]);
      setAssigningTo('');
    } catch {
      toast.error('Failed to assign leads.');
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
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <DashboardTableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Database</h1>
        <p className="text-sm text-muted-foreground mt-1">{totalLeads} matching leads</p>
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

      <div className="rounded-xl border border-border bg-card shadow-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, company, phone, or email..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 px-4"
              onClick={() => {
                setFilterOpen((value) => !value);
                setSortOpen(false);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Filters</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Clear all
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Location (State)</label>
                    <select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="all">All States</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Company Size</label>
                    <select value={sizeFilter} onChange={(event) => { setSizeFilter(event.target.value as CompanySizeRange); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="all">All Sizes</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Lead Owner</label>
                    <select value={ownerFilter} onChange={(event) => { setOwnerFilter(event.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="all">All Owners</option>
                      {agents.map((agent: any) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                    <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as any); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="all">All Statuses</option>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Lead Source</label>
                    <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="all">All Sources</option>
                      {SOURCE_OPTIONS.map((source) => (
                        <option key={source.value} value={source.value}>{source.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={sortRef}>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 px-4"
              onClick={() => {
                setSortOpen((value) => !value);
                setFilterOpen(false);
              }}
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </Button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <p className="text-sm font-semibold text-foreground">Sort By</p>
                </div>
                <div className="p-3 space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-secondary/40 cursor-pointer">
                      <input
                        type="radio"
                        name="sortOption"
                        value={option.value}
                        checked={sortBy === option.value}
                        onChange={() => {
                          setSortBy(option.value);
                          setPage(1);
                        }}
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
      </div>

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
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            per page
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <span className="text-sm font-medium text-foreground px-2">
            {safePage} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-elevated rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-semibold text-primary">{selectedIds.length} selected</span>
          <div className="h-6 w-px bg-border"></div>
          <select
            value={assigningTo}
            onChange={(e) => setAssigningTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="">Assign to...</option>
            {agents.filter((a: any) => a.role === 'sdr').map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!assigningTo || bulkAssign.isPending}
            onClick={handleBulkAssign}
          >
            {bulkAssign.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Assign'}
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