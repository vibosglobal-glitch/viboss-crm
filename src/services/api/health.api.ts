import { request } from './client';

export const healthApi = {
    check: () => request<{ status: string; db: string }>('/health'),
};
