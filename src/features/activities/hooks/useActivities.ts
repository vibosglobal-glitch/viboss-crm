import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyTasks, getLeadActivities, completeActivity, createActivity, getActivityFeed } from '../api/activities.api';

export const useMyTasks = () => {
    return useQuery({
        queryKey: ['my-tasks'],
        queryFn: getMyTasks,
    });
};

export const useLeadActivities = (leadId: string) => {
    return useQuery({
        queryKey: ['activities', leadId],
        queryFn: () => getLeadActivities(leadId),
        enabled: !!leadId,
    });
};

export const useCompleteActivity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => completeActivity(id, updates),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-tasks'] });
            qc.invalidateQueries({ queryKey: ['activities'] });
        },
    });
};

export const useCreateActivity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createActivity,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-tasks'] });
            qc.invalidateQueries({ queryKey: ['activities'] });
        },
    });
};

export const useActivityFeed = () => {
    return useQuery({
        queryKey: ['activity-feed'],
        queryFn: getActivityFeed,
        staleTime: 30_000,
    });
};
