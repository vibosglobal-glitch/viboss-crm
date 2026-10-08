'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { DateRange } from '@/components/common/DateFilter';
import type { HRLeadParams } from '@/features/hr/api/hr.api';

export function useHRDashboard(timeRange?: DateRange) {
    return useQuery({
        queryKey: ['hr-dashboard', timeRange],
        queryFn: () => api.hr.dashboard(timeRange),
        staleTime: 30_000,
    });
}

export function useHRLeads(params?: HRLeadParams) {
    return useQuery({
        queryKey: ['hr-leads', params],
        queryFn: () => api.hr.leads(params),
        staleTime: 30_000,
    });
}

export function useHRClosedLeads(params?: HRLeadParams) {
    return useQuery({
        queryKey: ['hr-closed-leads', params],
        queryFn: () => api.hr.closedLeads(params),
        staleTime: 30_000,
    });
}
