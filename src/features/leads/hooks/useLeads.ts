'use client';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { LeadImportResult, LeadListParams } from '@/features/leads/api/leads.api';

function invalidateDashboardQueries(qc: QueryClient) {
    qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
    qc.invalidateQueries({ queryKey: ['hr-leads'] });
    qc.invalidateQueries({ queryKey: ['hr-closed-leads'] });
}

export function useLeads(params?: LeadListParams) {
    return useQuery({
        queryKey: ['leads', params],
        queryFn: () => api.leads.list(params),
        staleTime: 30_000,
    });
}

export function usePaginatedLeads(params?: LeadListParams) {
    return useQuery({
        queryKey: ['leads', 'paginated', params],
        queryFn: () => api.leads.listPage(params),
        staleTime: 30_000,
        placeholderData: previousData => previousData,
    });
}

export function useLead(id: string) {
    return useQuery({
        queryKey: ['lead', id],
        queryFn: () => api.leads.get(id),
        enabled: !!id,
    });
}

export function useKPIs(params?: { dateFrom?: string; dateTo?: string }) {
    return useQuery({
        queryKey: ['kpis', params],
        queryFn: () => api.leads.kpis(params),
        staleTime: 30_000,
    });
}

export function useFunnel(params?: { dateFrom?: string; dateTo?: string }) {
    return useQuery({
        queryKey: ['funnel', params],
        queryFn: () => api.leads.funnel(params),
        staleTime: 60_000,
    });
}

// ── Mutations ──

export function useCompleteFollowUp() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (leadId: string) => api.leads.completeFollowUp(leadId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useScheduleFollowUp() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ leadId, date }: { leadId: string; date: string }) =>
            api.leads.scheduleFollowUp(leadId, date),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useUpdateLead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.leads.update(id, data),
        onMutate: async ({ id, data }) => {
            await qc.cancelQueries({ queryKey: ['leads'] });
            await qc.cancelQueries({ queryKey: ['lead', id] });

            const previousQueries = qc.getQueriesData({ queryKey: ['leads'] });
            const previousLead = qc.getQueryData(['lead', id]);

            if (data) {
                qc.setQueryData(['lead', id], (old: any) => old ? { ...old, ...data } : old);
                qc.setQueriesData({ queryKey: ['leads'] }, (old: any) => {
                    if (!old) return old;
                    if (Array.isArray(old)) {
                        return old.map(lead => (lead._id === id || lead.id === id) ? { ...lead, ...data } : lead);
                    }
                    if (old.data && Array.isArray(old.data)) {
                        return { ...old, data: old.data.map((lead: any) => (lead._id === id || lead.id === id) ? { ...lead, ...data } : lead) };
                    }
                    if (old.leads && Array.isArray(old.leads)) {
                        return { ...old, leads: old.leads.map((lead: any) => (lead._id === id || lead.id === id) ? { ...lead, ...data } : lead) };
                    }
                    return old;
                });
            }

            return { previousQueries, previousLead };
        },
        onError: (_err, { id }, context) => {
            if (context?.previousLead) {
                qc.setQueryData(['lead', id], context.previousLead);
            }
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    qc.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: (_data, _error, vars) => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['lead', vars.id] });
            qc.invalidateQueries({ queryKey: ['activities', vars.id] });
            qc.invalidateQueries({ queryKey: ['pipeline-board'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
            qc.invalidateQueries({ queryKey: ['funnel'] });
            invalidateDashboardQueries(qc);
        },
    });
}

export function useCreateLead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.leads.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useDeleteLead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.leads.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useImportPreview() {
    return useMutation({
        mutationFn: (file: File) => api.leads.importPreview(file),
    });
}

export function useImportCSV() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            file,
            customMappings,
            statusValueMappings,
        }: {
            file: File,
            customMappings?: Record<string, string | null>,
            statusValueMappings?: Record<string, string>,
        }) => api.leads.importCSV(file, customMappings, statusValueMappings),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useUndoImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ leadIds }: { leadIds: string[] }) => api.leads.undoImport(leadIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}

export function useBulkAssign() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ leadIds, assignedTo }: { leadIds: string[]; assignedTo: string }) =>
            api.leads.bulkAssign(leadIds, assignedTo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
        },
    });
}

export function useBulkDelete() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ leadIds }: { leadIds: string[] }) =>
            api.leads.bulkDelete(leadIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
        },
    });
}
