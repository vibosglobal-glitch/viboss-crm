'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useMeetings() {
    return useQuery({
        queryKey: ['meetings'],
        queryFn: () => api.meetings.list(),
        staleTime: 30_000,
    });
}

export function useCreateMeeting() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.meetings.create(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
    });
}

export function useUpdateMeeting() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.meetings.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
    });
}

export function useDeleteMeeting() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.meetings.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
    });
}
