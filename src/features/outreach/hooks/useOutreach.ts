'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outreachApi } from '../api/outreach.api';

export function useOutreachStats() {
    return useQuery({
        queryKey: ['outreach', 'stats'],
        queryFn: outreachApi.getStats,
    });
}

export function useLogOutreach() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: outreachApi.logEmails,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outreach', 'stats'] });
        },
    });
}
