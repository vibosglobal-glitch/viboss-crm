import type { DateRange } from '@/components/common/DateFilter';
import { request } from '@/services/api/client';

export interface HRDashboardSummary {
    totalLeads: number;
    activeLeads: number;
    appointmentSet: number;
    closedWon: number;
    totalCalls: number;
    totalMeetings: number;
    totalActivities: number;
}

export interface HRAgentStat {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    totalLeads: number;
    activeLeads: number;
    appointmentSet: number;
    closedWon: number;
    totalCalls: number;
    totalMeetings: number;
    totalActivities: number;
}

export interface HRDashboardData {
    teamStats: HRDashboardSummary;
    agentStats: HRAgentStat[];
}

export interface HRLeadParams {
    status?: string;
    search?: string;
    assignedTo?: string;
}

type Pagination = {
    total: number;
    page: number;
    limit: number;
    pages: number;
};

function appendDateRange(q: URLSearchParams, range?: DateRange) {
    if (!range || range === 'allTime') return;

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);

    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            break;
        case 'last7days':
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last30days':
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last90days':
            start.setDate(start.getDate() - 89);
            start.setHours(0, 0, 0, 0);
            break;
        case 'thisMonth':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        default:
            return;
    }

    q.set('dateFrom', start.toISOString());
    q.set('dateTo', end.toISOString());
}

function toPagination(raw: any, fallbackLength: number, fallbackPage = 1, fallbackLimit = 100): Pagination {
    return {
        total: Number(raw?.total ?? fallbackLength),
        page: Number(raw?.page ?? fallbackPage),
        limit: Number(raw?.limit ?? fallbackLimit),
        pages: Number(raw?.pages ?? 1),
    };
}

function normalizeDashboard(raw: any): HRDashboardData {
    const teamStats = raw?.teamStats ?? {};
    const agentStats = Array.isArray(raw?.agentStats) ? raw.agentStats : [];

    return {
        teamStats: {
            totalLeads: Number(teamStats.totalLeads ?? 0),
            activeLeads: Number(teamStats.activeLeads ?? Math.max(0, Number(teamStats.totalLeads ?? 0) - Number(teamStats.closedWon ?? 0))),
            appointmentSet: Number(teamStats.appointmentSet ?? 0),
            closedWon: Number(teamStats.closedWon ?? 0),
            totalCalls: Number(teamStats.totalCalls ?? 0),
            totalMeetings: Number(teamStats.totalMeetings ?? 0),
            totalActivities: Number(teamStats.totalActivities ?? 0),
        },
        agentStats: agentStats.map((entry: any) => {
            const agent = entry?.agent ?? entry ?? {};
            const totalLeads = Number(entry?.totalLeads ?? 0);
            const closedWon = Number(entry?.closedWon ?? 0);

            return {
                id: String(agent.id ?? ''),
                name: String(agent.name ?? 'Unknown'),
                email: String(agent.email ?? ''),
                avatar: agent.avatar ?? null,
                role: String(agent.role ?? ''),
                totalLeads,
                activeLeads: Math.max(0, totalLeads - closedWon),
                appointmentSet: Number(entry?.appointmentSet ?? 0),
                closedWon,
                totalCalls: Number(entry?.totalCalls ?? 0),
                totalMeetings: Number(entry?.totalMeetings ?? 0),
                totalActivities: Number(entry?.totalActivities ?? 0),
            } satisfies HRAgentStat;
        }),
    };
}

function normalizeLead(lead: any) {
    const calls = Array.isArray(lead?.calls) ? lead.calls : [];
    const activities = Array.isArray(lead?.activities) ? lead.activities : [];
    const callHistory = calls.map((call: any) => ({
        ...call,
        createdAt: call?.date || call?.createdAt || null,
        userId: call?.user || (call?.agentName ? { name: call.agentName } : null),
    }));
    const callAgents = Array.from(
        new Set(
            callHistory
                .map((call: any) => call?.userId?.name || call?.agentName)
                .filter(Boolean)
        )
    );
    const closedDate = lead?.activeServiceDate || lead?.contractSignDate || lead?.updatedAt || null;
    const callCount = Number(lead?._count?.calls ?? callHistory.length ?? 0);

    return {
        ...lead,
        companyName: lead?.company ?? lead?.companyName ?? '',
        uploadedBy: lead?.uploader ?? lead?.uploadedBy ?? null,
        callCount,
        totalCalls: callCount,
        callAgents,
        callHistory,
        activities: activities.map((activity: any) => ({
            ...activity,
            agent: activity?.user?.name || 'System',
            timestamp: activity?.createdAt ? new Date(activity.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        })),
        wonDate: closedDate,
    };
}

async function listLeadPage(endpoint: '/hr/leads' | '/hr/closed-leads', params?: HRLeadParams & { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.assignedTo) q.set('assignedTo', params.assignedTo);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const qs = q.toString();
    const raw = await request<any>(`${endpoint}${qs ? `?${qs}` : ''}`);
    const leads = Array.isArray(raw) ? raw : (raw?.leads ?? []);
    const pagination = !Array.isArray(raw) ? toPagination(raw?.pagination, leads.length, params?.page, params?.limit) : toPagination(null, leads.length, params?.page, params?.limit);

    return {
        leads: (Array.isArray(leads) ? leads : []).map(normalizeLead),
        pagination,
    };
}

async function listAllLeads(endpoint: '/hr/leads' | '/hr/closed-leads', params?: HRLeadParams) {
    const firstPage = await listLeadPage(endpoint, { ...params, page: 1, limit: 100 });
    const totalPages = Math.max(1, firstPage.pagination.pages);

    if (totalPages === 1) {
        return firstPage.leads;
    }

    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            listLeadPage(endpoint, { ...params, page: index + 2, limit: 100 })
        )
    );

    return [
        ...firstPage.leads,
        ...remainingPages.flatMap((pageResult) => pageResult.leads),
    ];
}

export const hrApi = {
    dashboard: async (timeRange?: DateRange) => {
        const q = new URLSearchParams();
        appendDateRange(q, timeRange);
        const qs = q.toString();
        const raw = await request<any>(`/hr/dashboard${qs ? `?${qs}` : ''}`);
        return normalizeDashboard(raw);
    },
    leads: async (params?: HRLeadParams) => listAllLeads('/hr/leads', params),
    closedLeads: async (params?: HRLeadParams) => listAllLeads('/hr/closed-leads', params),
};
