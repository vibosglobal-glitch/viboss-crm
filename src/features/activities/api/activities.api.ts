import { request } from '@/services/api/client';

export interface Activity {
    id: string;
    leadId: any;
    userId: any;
    type: string;
    callDuration?: number;
    callOutcome?: string;
    description?: string;
    fromStage?: any;
    toStage?: any;
    dueDate?: Date;
    isCompleted?: boolean;
    createdAt: Date;
}

export const getMyTasks = async () => {
    return request<Activity[]>('/activities/my/tasks');
};

function normalizeActivityType(type?: string) {
    return String(type || '')
        .replace(/_/g, '-')
        .toLowerCase();
}

function normalizeActivity(activity: any) {
    return {
        ...activity,
        type: normalizeActivityType(activity.type),
        agent: activity.agent || activity.user?.name || 'System',
        timestamp: activity.timestamp || activity.createdAt || activity.scheduledAt || new Date().toISOString(),
    };
}

export const getLeadActivities = async (leadId: string) => {
    const response = await request<any>(`/activities/lead/${leadId}?limit=100`);
    if (response && typeof response === 'object' && Array.isArray(response.activities)) {
        return response.activities.map(normalizeActivity) as Activity[];
    }
    return Array.isArray(response) ? response.map(normalizeActivity) as Activity[] : [];
};

export const completeActivity = async (id: string, updates: Partial<Activity>) => {
    return request<Activity>(`/activities/${id}/complete`, { method: 'PATCH', body: JSON.stringify(updates) });
};

export const createActivity = async (payload: Partial<Activity>) => {
    return request<Activity>('/activities', { method: 'POST', body: JSON.stringify(payload) });
};

export const getActivityFeed = async () => {
    const response = await request<any>('/activities/feed');
    if (response && typeof response === 'object' && Array.isArray(response.activities)) {
        return response.activities.map(normalizeActivity) as Activity[];
    }
    return Array.isArray(response) ? response.map(normalizeActivity) as Activity[] : [];
};
