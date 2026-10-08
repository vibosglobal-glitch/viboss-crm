import { request } from '@/services/api/client';

interface NotificationsResponse {
    notifications: any[];
    unreadCount: number;
    pagination: { total: number; page: number; limit: number; pages: number };
}

function normalizeNotification(n: any) {
    return {
        ...n,
        read: typeof n?.read === 'boolean' ? n.read : Boolean(n?.isRead),
        timestamp: n?.timestamp || n?.createdAt || '',
        leadId: n?.leadId || n?.relatedLeadId || undefined,
    };
}

export const notificationsApi = {
    list: async () => {
        const res = await request<NotificationsResponse>('/notifications');
        return (res.notifications ?? []).map(normalizeNotification);
    },
    markRead: (id: string) =>
        request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
        request<any>('/notifications/read-all', { method: 'PUT' }),
};
