'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useTasks(params?: { assignedTo?: string; status?: string; from?: string; to?: string; priority?: string }) {
    return useQuery({
        queryKey: ['tasks', params],
        queryFn: () => api.tasks.list(params),
        staleTime: 15_000,
    });
}

export function useCreateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.tasks.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}

export function useUpdateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}

export function useDeleteTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.tasks.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}
