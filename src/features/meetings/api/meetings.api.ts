import { request } from '@/services/api/client';

function normalizeMeeting(meeting: any) {
    const scheduledAt = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;
    const hasValidDate = scheduledAt && !Number.isNaN(scheduledAt.getTime());

    return {
        ...meeting,
        date: meeting.date || (hasValidDate ? scheduledAt.toISOString().split('T')[0] : ''),
        time: meeting.time || (hasValidDate
            ? scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            : ''),
        leadName: meeting.leadName || `${meeting.lead?.firstName || ''} ${meeting.lead?.lastName || ''}`.trim() || meeting.lead?.company || '',
        createdByName: meeting.createdByName || meeting.createdBy?.name || '',
    };
}

function toMeetingPayload(data: any) {
    const payload = { ...data };
    if (!payload.scheduledAt && payload.date) {
        const rawTime = typeof payload.time === 'string' && payload.time.length >= 5 ? payload.time.slice(0, 5) : '09:00';
        payload.scheduledAt = `${payload.date}T${rawTime}`;
    }

    delete payload.date;
    return payload;
}

export const meetingsApi = {
    list: async () => {
        const res = await request<any>('/meetings?limit=1000');
        const list = Array.isArray(res) ? res : (res.meetings || []);
        return Array.isArray(list) ? list.map(normalizeMeeting) : [];
    },
    create: async (data: any) =>
        normalizeMeeting(await request<any>('/meetings', { method: 'POST', body: JSON.stringify(toMeetingPayload(data)) })),
    update: async (id: string, data: any) =>
        normalizeMeeting(await request<any>(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(toMeetingPayload(data)) })),
    delete: (id: string) =>
        request<any>(`/meetings/${id}`, { method: 'DELETE' }),
};
