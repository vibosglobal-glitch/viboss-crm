'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserRole } from '@/features/auth/types/auth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        manager: '/admin',
        sdr: '/sdr',
        closer: '/sdr',
        hr: '/hr',
        leadgen: '/leadgen',
        lead_gen: '/leadgen',
      };
      router.replace(redirectMap[user.role] || '/login');
    }
  }, [isAuthenticated, user, allowedRoles, router, isLoading]);

  if (isLoading) return null;
  if (!isAuthenticated || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
