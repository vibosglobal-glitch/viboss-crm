import { request } from '@/services/api/client';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'admin' | 'manager' | 'sdr' | 'closer' | 'hr' | 'lead_gen' | 'leadgen';
}

export interface AuthSessionResponse {
    user: AuthUser;
    impersonatedBy?: string | null;
}

/** Shape returned by login / impersonate — no token in body (server sets httpOnly cookie) */
export type LoginResponse = AuthSessionResponse;

export const authApi = {
    login: (email: string, password: string) =>
        request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    logout: () =>
        request<{ message: string }>('/auth/logout', { method: 'POST' }),
    refresh: () =>
        request<AuthSessionResponse>('/auth/refresh', { method: 'POST' }),
    me: () => request<AuthSessionResponse>('/auth/me'),
    impersonate: (userId: string) =>
        request<AuthSessionResponse>('/auth/impersonate', {
            method: 'POST',
            body: JSON.stringify({ userId }),
        }),
    exitImpersonation: () =>
        request<AuthSessionResponse>('/auth/exit-impersonation', { method: 'POST' }),
    register: (data: { name: string; email: string; role: string; avatar?: string }) =>
        request<{ user: AuthUser }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    forgotPassword: (email: string) =>
        request<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),
    resetPassword: (token: string, password: string) =>
        request<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
        }),
    changePassword: (currentPassword: string, newPassword: string) =>
        request<{ message: string }>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        }),
};
