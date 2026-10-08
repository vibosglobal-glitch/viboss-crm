'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.notifications.list(),
        staleTime: 15_000,
        refetchInterval: 30_000,
    });
}

export function useMarkNotificationRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.notifications.markRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
}

export function useMarkAllNotificationsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.notifications.markAllRead(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
