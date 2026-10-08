import { request } from '@/services/api/client';
import { Lead } from '@/features/leads/types/leads';

export interface PipelineStage {
    id: string;
    _id?: string;
    name: string;
    order: number;
    color: string;
    probability: number;
    isDefault?: boolean;
    isActive?: boolean;
}

export interface PipelineBoardColumn {
    id: string;
    _id: string;
    name: string;
    color: string;
    order: number;
    probability: number;
    stage?: PipelineStage;
    leads: Lead[];
    count: number;
    totalValue: number;
}

export const getPipelineStages = async () => {
    return request<PipelineStage[]>('/pipeline/stages');
};

export const getPipelineBoard = async (params?: { assignedTo?: string; search?: string; dateFrom?: string; dateTo?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    const rawBoard = await request<any[]>(`/pipeline/board${qs ? `?${qs}` : ''}`);

    return (Array.isArray(rawBoard) ? rawBoard : []).map((column) => {
        const stage = column.stage || column;
        const leads = Array.isArray(column.leads) ? column.leads : [];
        const totalValue = leads.reduce((sum: number, lead: Lead) => sum + (Number(lead.dealValue) || 0), 0);

        return {
            id: stage.id || column.id || column._id,
            _id: stage.id || column.id || column._id,
            name: stage.name || column.name || 'Unassigned Stage',
            color: stage.color || column.color || '#9ca3af',
            order: stage.order ?? column.order ?? 0,
            probability: stage.probability ?? column.probability ?? 0,
            stage: {
                id: stage.id || column.id || column._id,
                _id: stage.id || column.id || column._id,
                name: stage.name || column.name || 'Unassigned Stage',
                color: stage.color || column.color || '#9ca3af',
                order: stage.order ?? column.order ?? 0,
                probability: stage.probability ?? column.probability ?? 0,
                isDefault: stage.isDefault ?? column.isDefault,
                isActive: stage.isActive ?? column.isActive,
            },
            leads,
            count: typeof column.count === 'number' ? column.count : leads.length,
            totalValue,
        } satisfies PipelineBoardColumn;
    });
};

export const updateLeadStage = async (leadId: string, stageId: string, extra?: { dealValue?: number; lostReason?: string; expectedCloseDate?: string }) => {
    return request<Lead>(`/pipeline/leads/${leadId}/stage`, { method: 'PATCH', body: JSON.stringify({ stageId, ...extra }) });
};
