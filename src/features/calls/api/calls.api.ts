import { request } from '@/services/api/client';

/** Raw call shape from the backend before normalization. */
interface RawCall {
    id?: string;
    _id?: string;
    leadId?: string;
    userId?: string;
    lead?: { id?: string; firstName?: string; lastName?: string; company?: string };
    user?: { id?: string; name?: string };
    leadName?: string;
    agentName?: string;
    date?: string;
    time?: string;
    duration?: number | string;
    status?: string;
    outcome?: string;
    notes?: string;
    hasRecording?: boolean;
    recordingUrl?: string;
    createdAt?: string;
    occurredAt?: string;
}

type CallListResponse = RawCall[] | {
    calls?: RawCall[];
    pagination?: { total?: number; page?: number; limit?: number; pages?: number };
};

interface CreateCallPayload {
    leadId: string;
    leadName: string;
    agentName: string;
    date: string | Date;
    time: string;
    duration: string;
    status: string;
    outcome?: string;
    notes?: string;
    hasRecording?: boolean;
}

interface UpdateCallPayload {
    notes?: string;
    duration?: number | string;
    status?: string;
    outcome?: string;
    recordingUrl?: string;
}

const STATUS_LABELS: Record<string, 'Completed' | 'Missed' | 'Follow-up'> = {
    Completed: 'Completed',
    Missed: 'Missed',
    Voicemail: 'Missed',
    Scheduled: 'Follow-up',
    No_Answer: 'Missed',
    Busy: 'Missed',
    Failed: 'Missed',
};

function formatDuration(seconds: unknown) {
    if (typeof seconds === 'string') {
        return seconds;
    }

    const totalSeconds = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    if (minutes === 0) {
        return remainingSeconds > 0 ? `${remainingSeconds}s` : '0 min';
    }
    if (remainingSeconds === 0) {
        return `${minutes} min`;
    }
    return `${minutes}m ${remainingSeconds}s`;
}

function getLeadName(call: RawCall) {
    if (call.leadName) {
        return call.leadName;
    }

    const fullName = `${call.lead?.firstName || ''} ${call.lead?.lastName || ''}`.trim();
    return fullName || call.lead?.company || 'Unknown Lead';
}

function getDateParts(call: RawCall) {
    const parsed = call.date ? new Date(call.date) : null;
    const hasValidDate = parsed && !Number.isNaN(parsed.getTime());
    const displayDate = hasValidDate ? parsed.toLocaleDateString('en-US') : '—';
    const displayTime = call.time || (hasValidDate
        ? parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : '—');

    return { displayDate, displayTime };
}

function normalizeCall(call: RawCall) {
    const { displayDate, displayTime } = getDateParts(call);
    const occurredAt = call.date || call.createdAt || null;
    return {
        ...call,
        id: call.id || call._id || '',
        leadId: call.leadId || call.lead?.id || '',
        userId: call.userId || call.user?.id || '',
        leadName: getLeadName(call),
        agentName: call.agentName || call.user?.name || 'Unknown Agent',
        occurredAt,
        date: displayDate,
        time: displayTime,
        duration: formatDuration(call.duration),
        status: (call.status ? STATUS_LABELS[call.status] : undefined) || 'Completed',
        hasRecording: Boolean(call.hasRecording ?? call.recordingUrl),
        notes: call.notes || '',
    };
}

async function listPage(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const res = await request<CallListResponse>(`/calls${qs ? `?${qs}` : ''}`);
    const list = Array.isArray(res) ? res : res.calls ?? [];
    const pagination = !Array.isArray(res) ? res.pagination : null;

    return {
        calls: Array.isArray(list) ? list.map(normalizeCall) : [],
        pagination: {
            total: Number(pagination?.total ?? list.length),
            page: Number(pagination?.page ?? params?.page ?? 1),
            limit: Number(pagination?.limit ?? params?.limit ?? Math.max(list.length, 1)),
            pages: Number(pagination?.pages ?? 1),
        },
    };
}

export const callsApi = {
    list: async (params?: { status?: string; search?: string }) => {
        const firstPage = await listPage({ ...params, page: 1, limit: 100 });
        const totalPages = Math.max(1, firstPage.pagination.pages);

        if (totalPages === 1) {
            return firstPage.calls;
        }

        const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                listPage({ ...params, page: index + 2, limit: 100 })
            )
        );

        return [
            ...firstPage.calls,
            ...remainingPages.flatMap((pageResult) => pageResult.calls),
        ];
    },
    get: async (id: string) => normalizeCall(await request<RawCall>(`/calls/${id}`)),
    create: async (data: CreateCallPayload) => normalizeCall(await request<RawCall>('/calls', { method: 'POST', body: JSON.stringify(data) })),
    update: async (id: string, data: UpdateCallPayload) => normalizeCall(await request<RawCall>(`/calls/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
};
