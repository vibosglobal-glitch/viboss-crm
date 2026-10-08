import { request } from '@/services/api/client';

export interface OutreachStats {
    totalEmails: number;
    todayEmails: number;
    todayDate: string;
    totalReplies: number;
    totalBounced: number;
    replyRate: number;
    records: any[];
}

type OutreachLogPayload = {
    emailsSent: number;
    replies?: number;
    bounced?: number;
    dateSent?: string;
    platform?: string;
    campaignName?: string;
    notes?: string;
};

function normalizeOutreachStats(response: any): OutreachStats {
    const records = Array.isArray(response?.records) ? response.records : [];
    const stats = response?.stats ?? response ?? {};
    const todayDate = new Date().toISOString().split('T')[0];

    const todayEmails = records.reduce((sum: number, record: any) => {
        const dateSent = record?.dateSent ? new Date(record.dateSent).toISOString().split('T')[0] : null;
        return dateSent === todayDate ? sum + (Number(record?.emailsSent) || 0) : sum;
    }, 0);

    return {
        totalEmails: Number(stats.totalEmails ?? 0),
        todayEmails,
        todayDate,
        totalReplies: Number(stats.totalReplies ?? 0),
        totalBounced: Number(stats.totalBounced ?? 0),
        replyRate: Number(stats.replyRate ?? 0),
        records,
    };
}

function toOutreachPayload(payload: number | OutreachLogPayload): OutreachLogPayload {
    if (typeof payload === 'number') {
        return { emailsSent: payload };
    }

    return {
        emailsSent: Number(payload.emailsSent) || 0,
        replies: payload.replies,
        bounced: payload.bounced,
        dateSent: payload.dateSent,
        platform: payload.platform,
        campaignName: payload.campaignName,
        notes: payload.notes,
    };
}

export const outreachApi = {
    getStats: async () =>
        normalizeOutreachStats(await request<any>('/outreach')),

    logEmails: (payload: number | OutreachLogPayload) =>
        request('/outreach', {
            method: 'POST',
            body: JSON.stringify(toOutreachPayload(payload)),
        }),
};
