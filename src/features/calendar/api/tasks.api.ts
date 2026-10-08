import { request } from '@/services/api/client';

function normalizeTaskStatus(status?: string | null) {
    switch (status) {
        case 'pending':
            return 'todo';
        case 'in_progress':
            return 'in-progress';
        default:
            return status || 'todo';
    }
}

function toTaskStatus(status?: string | null) {
    switch (status) {
        case 'todo':
            return 'pending';
        case 'in-progress':
            return 'in_progress';
        default:
            return status || undefined;
    }
}

function normalizeTask(task: any) {
    const assignedToName = typeof task?.assignedTo === 'string'
        ? task.assignedTo
        : task?.assignedTo?.name || '';

    return {
        ...task,
        status: normalizeTaskStatus(task?.status),
        dueDate: task?.dueDate || null,
        assignedTo: assignedToName,
        assignedToUser: typeof task?.assignedTo === 'object' ? task.assignedTo : null,
        createdByName: task?.createdBy?.name || '',
        leadName: task?.leadName
            || `${task?.lead?.firstName || ''} ${task?.lead?.lastName || ''}`.trim()
            || task?.lead?.company
            || '',
        category: task?.category || 'other',
    };
}

function toTaskPayload(data: any) {
    const payload = { ...data };
    const normalizedStatus = toTaskStatus(payload.status);

    if (Array.isArray(payload.assignedToIds)) {
        payload.assignedToIds = payload.assignedToIds.filter((id: unknown) => typeof id === 'string' && id.length > 0);
        if (payload.assignedToIds.length === 0) {
            delete payload.assignedToIds;
        }
    }

    if (payload.leadId === '') {
        payload.leadId = null;
    }

    if (payload.assignedToId === '') {
        payload.assignedToId = null;
    }

    if (payload.assignedTo === '') {
        payload.assignedTo = null;
    }

    if (payload.leadName === '') {
        payload.leadName = null;
    }

    if (normalizedStatus) {
        payload.status = normalizedStatus;
    } else {
        delete payload.status;
    }

    return payload;
}

async function listPage(params?: { assignedTo?: string; status?: string; from?: string; to?: string; priority?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.assignedTo) q.set('assignedTo', params.assignedTo);
    if (params?.status) q.set('status', toTaskStatus(params.status) || params.status);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const res = await request<any>(`/tasks${qs ? `?${qs}` : ''}`);
    const tasks = Array.isArray(res) ? res : (res.tasks || []);
    const pagination = res && !Array.isArray(res) ? res.pagination : null;

    return {
        tasks: (Array.isArray(tasks) ? tasks : []).map(normalizeTask),
        pagination: {
            total: Number(pagination?.total ?? tasks.length),
            page: Number(pagination?.page ?? params?.page ?? 1),
            limit: Number(pagination?.limit ?? params?.limit ?? Math.max(tasks.length, 1)),
            pages: Number(pagination?.pages ?? 1),
        },
    };
}

export const tasksApi = {
    list: async (params?: { assignedTo?: string; status?: string; from?: string; to?: string; priority?: string }) => {
        const firstPage = await listPage({ ...params, page: 1, limit: 100 });
        const totalPages = Math.max(1, firstPage.pagination.pages);

        if (totalPages === 1) {
            return firstPage.tasks;
        }

        const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                listPage({ ...params, page: index + 2, limit: 100 })
            )
        );

        return [
            ...firstPage.tasks,
            ...remainingPages.flatMap((pageResult) => pageResult.tasks),
        ];
    },
    get: async (id: string) => normalizeTask(await request<any>(`/tasks/${id}`)),
    create: (data: any) =>
        request<any>('/tasks', { method: 'POST', body: JSON.stringify(toTaskPayload(data)) }).then(normalizeTask),
    update: (id: string, data: any) =>
        request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(toTaskPayload(data)) }).then(normalizeTask),
    delete: (id: string) =>
        request<any>(`/tasks/${id}`, { method: 'DELETE' }),
};
