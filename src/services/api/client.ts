const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
const REQUEST_TIMEOUT = 30_000; // 30 seconds

const NO_REFRESH_RETRY_ENDPOINTS = [
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
];

function shouldSkipRefreshRetry(endpoint: string): boolean {
    return NO_REFRESH_RETRY_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

let refreshPromise: Promise<void> | null = null;

async function tryRefresh(): Promise<void> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Refresh failed');
        } finally {
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

function redirectToLogin() {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

export async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
): Promise<T> {
    // Don't set Content-Type for FormData — the browser needs to set boundary automatically
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',  // always send httpOnly cookies
            signal: controller.signal,
        });

        if (res.status === 401 && !isRetry && !shouldSkipRefreshRetry(endpoint)) {
            // Attempt silent refresh then retry once
            try {
                await tryRefresh();
                return request<T>(endpoint, options, true);
            } catch {
                redirectToLogin();
                throw new Error('Unauthorized');
            }
        }

        if (res.status === 401) {
            const body = await res.json().catch(() => ({}));
            const message = (body as { error?: string }).error || 'Unauthorized';
            if (!shouldSkipRefreshRetry(endpoint)) {
                redirectToLogin();
            }
            throw new Error(message);
        }

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
        }

        return res.json();
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}
