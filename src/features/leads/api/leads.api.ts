import { request } from '@/services/api/client';
import { LeadSchema, LeadsListSchema, KPIsSchema } from '@/features/leads/schemas/lead.schema';
import type { Lead, KPIs } from '@/features/leads/schemas/lead.schema';

export interface LeadListParams {
    status?: string;
    search?: string;
    agent?: string;
    assignedTo?: string;
    pipelineStage?: string;
    source?: string;
    state?: string;
    priority?: string;
    hasFollowUp?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
    employeeCountMin?: number;
    employeeCountMax?: number;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface PaginatedLeadsResult {
    leads: Lead[];
    pagination: PaginationMeta;
}

export interface LeadImportError {
    row: number;
    error: string;
}

export interface LeadImportResult {
    totalRows?: number;
    imported: number;
    created?: number;
    skipped: number;
    duplicatesInFile?: number;
    duplicatesInDB?: number;
    errors: number;
    errorDetails: LeadImportError[];
    createdLeadIds: string[];
    canUndoImport: boolean;
}

export interface UndoImportResult {
    deleted: number;
}

export interface BulkAssignResult {
    assigned: number;
    results: Array<{
        leadId: string;
        assignedTo: string;
    }>;
}

async function validated<T>(schema: { parse: (v: unknown) => T }, value: unknown): Promise<T> {
    try {
        return schema.parse(value);
    } catch {
        // Return raw data if validation fails to avoid breaking the app
        return value as T;
    }
}

function normalizeLead(lead: any): Lead {
    return {
        ...lead,
        name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        companyName: lead.companyName || lead.company || '',
        title: lead.title || lead.jobTitle || '',
        assignedAgent: lead.assignedAgent || lead.assignedTo?.name || '',
        addedBy: lead.addedBy || lead.uploader?.name || '',
    };
}

function buildLeadQuery(params?: LeadListParams): string {
    const q = new URLSearchParams();
    const assignedTo = params?.assignedTo || params?.agent;

    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (assignedTo) q.set('assignedTo', assignedTo);
    if (params?.pipelineStage) q.set('pipelineStage', params.pipelineStage);
    if (params?.source) q.set('source', params.source);
    if (params?.state) q.set('state', params.state);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.hasFollowUp) q.set('hasFollowUp', 'true');
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.employeeCountMin !== undefined) q.set('employeeCountMin', String(params.employeeCountMin));
    if (params?.employeeCountMax !== undefined) q.set('employeeCountMax', String(params.employeeCountMax));

    return q.toString();
}

export const leadsApi = {
    listPage: async (params?: LeadListParams): Promise<PaginatedLeadsResult> => {
        const qs = buildLeadQuery(params);
        const raw = await request<unknown>(`/leads${qs ? `?${qs}` : ''}`);

        const list = raw && typeof raw === 'object' && !Array.isArray(raw) && 'leads' in raw
            ? (raw as any).leads
            : raw;

        const paginationRaw = raw && typeof raw === 'object' && !Array.isArray(raw) && 'pagination' in raw
            ? (raw as any).pagination
            : null;

        const enhancedList = (Array.isArray(list) ? list : []).map(normalizeLead);
        const leads = await validated(LeadsListSchema, enhancedList);

        return {
            leads,
            pagination: {
                total: Number(paginationRaw?.total ?? leads.length),
                page: Number(paginationRaw?.page ?? params?.page ?? 1),
                limit: Number(paginationRaw?.limit ?? params?.limit ?? Math.max(leads.length, 1)),
                pages: Number(paginationRaw?.pages ?? 1),
            },
        };
    },
    list: async (params?: LeadListParams): Promise<Lead[]> => {
        const baseParams = { ...params };
        delete baseParams.page;
        delete baseParams.limit;

        const firstPage = await leadsApi.listPage({ ...baseParams, page: 1, limit: 100 });
        const totalPages = Math.max(1, firstPage.pagination.pages);

        if (totalPages === 1) {
            return firstPage.leads;
        }

        const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                leadsApi.listPage({ ...baseParams, page: index + 2, limit: 100 })
            )
        );

        return [
            ...firstPage.leads,
            ...remainingPages.flatMap((pageResult) => pageResult.leads),
        ];
    },
    kpis: async (params?: { dateFrom?: string; dateTo?: string }): Promise<KPIs> => {
        const qs = params ? new URLSearchParams(
            Object.entries(params).filter(([, v]) => v) as [string, string][]
        ).toString() : '';
        const raw = await request<unknown>(`/leads/kpis${qs ? `?${qs}` : ''}`);
        return validated(KPIsSchema, raw);
    },
    get: async (id: string): Promise<Lead> => {
        const raw = await request<any>(`/leads/${id}`);
        let leadData = raw && typeof raw === 'object' && 'lead' in raw ? raw.lead : raw;

        if (leadData) {
            leadData = normalizeLead(leadData);
        }

        return validated(LeadSchema, leadData);
    },
    create: (data: any) =>
        request<any>('/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
        request<any>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<any>(`/leads/${id}`, { method: 'DELETE' }),
    importPreview: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return request<unknown>('/leads/import/preview', { method: 'POST', body: formData });
    },
    importCSV: async (
        file: File,
        customMappings?: Record<string, string | null>,
        statusValueMappings?: Record<string, string>
    ): Promise<LeadImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        if (customMappings) {
            formData.append('customMappings', JSON.stringify(customMappings));
        }
        if (statusValueMappings && Object.keys(statusValueMappings).length > 0) {
            formData.append('statusValueMappings', JSON.stringify(statusValueMappings));
        }
        return request<LeadImportResult>('/leads/import', { method: 'POST', body: formData });
    },
    undoImport: (leadIds: string[]) =>
        request<UndoImportResult>('/leads/import/undo', { method: 'POST', body: JSON.stringify({ leadIds }) }),
    completeFollowUp: (id: string) =>
        request<any>(`/leads/${id}/complete-followup`, { method: 'POST' }),
    scheduleFollowUp: (id: string, date: string) =>
        request<any>(`/leads/${id}/schedule-followup`, { method: 'POST', body: JSON.stringify({ date }) }),
    bulkAssign: (leadIds: string[], assignedTo: string) =>
        request<BulkAssignResult>('/leads/bulk-assign', { method: 'POST', body: JSON.stringify({ leadIds, assignedTo }) }),
    bulkDelete: (leadIds: string[]) =>
        request<{ deleted: number }>('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ leadIds }) }),
    funnel: (params?: { dateFrom?: string; dateTo?: string }) => {
        const q = new URLSearchParams();
        if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
        if (params?.dateTo) q.set('dateTo', params.dateTo);
        const qs = q.toString();
        return request<any>(`/leads/funnel${qs ? `?${qs}` : ''}`);
    },
};
