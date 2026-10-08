'use client';

import { CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'allTime';

export interface DateFilterProps {
    value: DateRange;
    onChange: (value: DateRange) => void;
}

type DateValueGetter<T> = keyof T | ((item: T) => Date | string | null | undefined);

export function filterByDateRange<T extends { date?: Date | string; createdAt?: Date | string }>(
    items: T[],
    range: DateRange,
    dateField: DateValueGetter<T> = 'date' as keyof T
): T[] {
    if (range === 'allTime') return items;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const last7DaysStart = new Date(todayStart);
    last7DaysStart.setDate(last7DaysStart.getDate() - 6);

    const last30DaysStart = new Date(todayStart);
    last30DaysStart.setDate(last30DaysStart.getDate() - 29);

    const last90DaysStart = new Date(todayStart);
    last90DaysStart.setDate(last90DaysStart.getDate() - 89);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return items.filter(item => {
        const rawDate = typeof dateField === 'function'
            ? dateField(item)
            : item[dateField] || (item as any).createdAt;
        if (!rawDate) return false;

        const d = new Date(rawDate as any);

        switch (range) {
            case 'today':
                return d >= todayStart;
            case 'yesterday':
                return d >= yesterdayStart && d < todayStart;
            case 'last7days':
                return d >= last7DaysStart;
            case 'last30days':
                return d >= last30DaysStart;
            case 'last90days':
                return d >= last90DaysStart;
            case 'thisMonth':
                return d >= thisMonthStart;
            default:
                return true;
        }
    });
}

export default function DateFilter({ value, onChange }: DateFilterProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CalendarDays className="h-4 w-4" />
            </div>
            <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
                <SelectTrigger className="h-8 w-[140px] text-sm font-medium">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="last90days">Last 90 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="allTime">All Time</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
