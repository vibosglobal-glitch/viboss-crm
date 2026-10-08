import { useAuth } from '@/features/auth/context/AuthContext';

export function useRole() {
    const { user } = useAuth();

    const role = user?.role || 'guest';

    return {
        role,
        isSDR: role === 'sdr' || role === 'closer', // Closers share SDR workspace view
        isCloser: role === 'closer',
        isLeadGen: role === 'lead_gen' || role === 'leadgen',
        isHR: role === 'hr',
        isAdmin: role === 'admin' || role === 'manager', // Managers share Admin view usually
        isManager: role === 'manager',
    };
}
