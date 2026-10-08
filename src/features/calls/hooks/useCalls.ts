'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface CreateCallPayload {
    leadId: string;
    leadName: string;
    agentName: string;
    date: string | Date;
    time: string;
    duration: string;
    status: string;
    outcome?: string;
    notes?: string;
    hasRecording?: boolean;
}

interface UpdateCallPayload {
    notes?: string;
    duration?: number | string;
    status?: string;
    outcome?: string;
    recordingUrl?: string;
}

export function useCalls(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ['calls', params],
        queryFn: () => api.calls.list(params),
        staleTime: 30_000,
    });
}

export function useCall(id: string) {
    return useQuery({
        queryKey: ['call', id],
        queryFn: () => api.calls.get(id),
        enabled: !!id,
    });
}

export function useCreateCall() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCallPayload) => api.calls.create(data),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: ['calls'] });
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['lead', vars.leadId] });
            qc.invalidateQueries({ queryKey: ['pipeline-board'] });
            qc.invalidateQueries({ queryKey: ['agents'] });
            qc.invalidateQueries({ queryKey: ['kpis'] });
            qc.invalidateQueries({ queryKey: ['funnel'] });
            qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
            qc.invalidateQueries({ queryKey: ['hr-leads'] });
            qc.invalidateQueries({ queryKey: ['hr-closed-leads'] });
        },
    });
}

export function useUpdateCall() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCallPayload }) => api.calls.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['calls'] });
            qc.invalidateQueries({ queryKey: ['call'] });
        },
    });
}
