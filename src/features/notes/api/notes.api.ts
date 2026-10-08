import { request } from '@/services/api/client';

async function listPage(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    const res = await request<any>(`/notes${qs ? `?${qs}` : ''}`);
    const notes = Array.isArray(res) ? res : (res.notes || []);
    const pagination = res && !Array.isArray(res) ? res.pagination : null;

    return {
        notes: Array.isArray(notes) ? notes : [],
        pagination: {
            total: Number(pagination?.total ?? notes.length),
            page: Number(pagination?.page ?? params?.page ?? 1),
            limit: Number(pagination?.limit ?? params?.limit ?? Math.max(notes.length, 1)),
            pages: Number(pagination?.pages ?? 1),
        },
    };
}

export const notesApi = {
    list: async () => {
        const firstPage = await listPage({ page: 1, limit: 100 });
        const totalPages = Math.max(1, firstPage.pagination.pages);

        if (totalPages === 1) {
            return firstPage.notes;
        }

        const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                listPage({ page: index + 2, limit: 100 })
            )
        );

        return [
            ...firstPage.notes,
            ...remainingPages.flatMap((pageResult) => pageResult.notes),
        ];
    },
    create: (content: string) =>
        request<any>('/notes', { method: 'POST', body: JSON.stringify({ content }) }),
    update: (id: string, content: string) =>
        request<any>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    delete: (id: string) =>
        request<any>(`/notes/${id}`, { method: 'DELETE' }),
};
