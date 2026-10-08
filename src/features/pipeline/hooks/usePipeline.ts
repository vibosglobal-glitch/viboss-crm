import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPipelineStages, getPipelineBoard, updateLeadStage, PipelineBoardColumn } from '../api/pipeline.api';
import { toast } from 'sonner';

export const usePipelineStages = () => {
    return useQuery({
        queryKey: ['pipeline-stages'],
        queryFn: getPipelineStages,
    });
};

export const usePipelineBoard = (params?: { assignedTo?: string; search?: string; dateFrom?: string; dateTo?: string }) => {
    return useQuery({
        queryKey: ['pipeline-board', params],
        queryFn: () => getPipelineBoard(params),
    });
};

export const useUpdateLeadStage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ leadId, stageId, ...extra }: { leadId: string; stageId: string; dealValue?: number; lostReason?: string; expectedCloseDate?: string }) =>
            updateLeadStage(leadId, stageId, extra),
        onMutate: async ({ leadId, stageId }) => {
            // Cancel outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['pipeline-board'] });

            // Snapshot the previous board
            const previous = queryClient.getQueriesData<PipelineBoardColumn[]>({ queryKey: ['pipeline-board'] });

            // Optimistically move the lead between columns
            queryClient.setQueriesData<PipelineBoardColumn[]>({ queryKey: ['pipeline-board'] }, (old) => {
                if (!old) return old;
                let movedLead: any = null;

                // Remove from source column
                const updated = old.map(col => {
                    const idx = col.leads.findIndex((l: any) => (l.id || l._id) === leadId);
                    if (idx !== -1) {
                        movedLead = col.leads[idx];
                        return {
                            ...col,
                            leads: col.leads.filter((l: any) => (l.id || l._id) !== leadId),
                            count: col.count - 1,
                            totalValue: col.totalValue - ((movedLead as any)?.dealValue || 0),
                        };
                    }
                    return col;
                });

                if (!movedLead) return old;

                // Add to destination column
                return updated.map(col => {
                    if ((col as any).id === stageId || col._id === stageId) {
                        return {
                            ...col,
                            leads: [...col.leads, movedLead],
                            count: col.count + 1,
                            totalValue: col.totalValue + ((movedLead as any)?.dealValue || 0),
                        };
                    }
                    return col;
                });
            });

            return { previous };
        },
        onSuccess: (_data, vars) => {
            toast.success('Lead stage updated');
            queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead', vars.leadId] });
            queryClient.invalidateQueries({ queryKey: ['activities', vars.leadId] });
            queryClient.invalidateQueries({ queryKey: ['kpis'] });
            queryClient.invalidateQueries({ queryKey: ['funnel'] });
            queryClient.invalidateQueries({ queryKey: ['hr-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['hr-leads'] });
            queryClient.invalidateQueries({ queryKey: ['hr-closed-leads'] });
        },
        onError: (error: any, _vars, context) => {
            // Rollback on error
            if (context?.previous) {
                for (const [key, data] of context.previous) {
                    queryClient.setQueryData(key, data);
                }
            }
            toast.error(error.message || 'Failed to update stage');
        },
    });
};
