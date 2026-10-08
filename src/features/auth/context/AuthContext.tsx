'use client';
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/features/auth/types/auth';
import { api } from '@/services/api';
import { disconnectSocket } from '@/hooks/useSocket';

type AuthSession = {
  user: AuthUser;
  impersonatedBy?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  impersonatedBy: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>;
  logout: () => void;
  impersonate: (userId: string) => Promise<{ success: boolean; error?: string }>;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setImpersonatedBy(session.impersonatedBy ?? null);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setImpersonatedBy(null);
  }, []);

  useEffect(() => {
    let active = true;

    api.auth.me()
      .then((session) => {
        if (!active) return;
        applySession(session);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api.auth.login(email, password);
      applySession(result);
      return { success: true, role: result.user.role };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      return { success: false, error: msg };
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    disconnectSocket();
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  const impersonate = useCallback(async (userId: string) => {
    try {
      const result = await api.auth.impersonate(userId);
      applySession(result);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impersonation failed';
      return { success: false, error: msg };
    }
  }, [applySession]);

  /** Restore the original admin session without requiring re-login */
  const exitImpersonation = useCallback(async () => {
    try {
      const result = await api.auth.exitImpersonation();
      applySession(result);
      router.push('/admin');
    } catch {
      // Backup cookie expired — fall back to full logout
      try { await api.auth.logout(); } catch { /* ignore */ }
      clearSession();
      router.push('/login');
    }
  }, [applySession, clearSession, router]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, impersonatedBy, login, logout, impersonate, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
