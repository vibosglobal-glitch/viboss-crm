'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useAgents() {
    return useQuery({
        queryKey: ['agents'],
        queryFn: () => api.agents.list(),
        staleTime: 60_000,
    });
}

export function useCreateAgent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; email: string; password: string; role: 'admin' | 'manager' | 'sdr' | 'closer' | 'hr' | 'lead_gen' }) =>
            api.agents.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['agents'] });
        },
    });
}

export function useDeleteAgent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.agents.delete(id),
        onMutate: async (id: string) => {
            await qc.cancelQueries({ queryKey: ['agents'] });
            const previous = qc.getQueriesData({ queryKey: ['agents'] });
            qc.setQueriesData({ queryKey: ['agents'] }, (old: any) =>
                Array.isArray(old) ? old.filter((a: any) => a.id !== id && a._id !== id) : old
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                context.previous.forEach(([key, data]) => qc.setQueryData(key, data));
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['agents'] });
        },
    });
}
