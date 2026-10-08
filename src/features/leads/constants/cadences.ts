/**
 * Cadence System — Touch Templates (§7-8)
 *
 * Cold 14-day cadence:  structured 7-touch over 14 days
 * Warm fast cadence:    accelerated 5-touch over 3 days
 */

export interface CadenceTouch {
    day: number;
    type: 'call' | 'email' | 'linkedin';
    label: string;
}

export interface CadenceTemplate {
    key: string;
    label: string;
    description: string;
    touches: CadenceTouch[];
}

export const COLD_14DAY: CadenceTemplate = {
    key: 'cold-14day',
    label: 'Cold 14-Day',
    description: 'Standard cold outreach — 7 touches over 14 days',
    touches: [
        { day: 1, type: 'call', label: 'Initial Call' },
        { day: 1, type: 'email', label: 'Intro Email' },
        { day: 2, type: 'call', label: 'Follow-up Call' },
        { day: 2, type: 'linkedin', label: 'LinkedIn Connect' },
        { day: 4, type: 'call', label: 'Check-in Call' },
        { day: 4, type: 'email', label: 'Value Prop Email' },
        { day: 6, type: 'call', label: 'Persistence Call' },
        { day: 8, type: 'email', label: 'Value CTA Email' },
        { day: 10, type: 'call', label: 'Re-engage Call' },
        { day: 14, type: 'email', label: 'Breakup Email' },
    ],
};

export const WARM_FAST: CadenceTemplate = {
    key: 'warm-fast',
    label: 'Warm Fast',
    description: 'Accelerated outreach for warm/engaged leads — 5 touches in 3 days',
    touches: [
        { day: 0, type: 'call', label: 'Immediate Call' },
        { day: 0, type: 'email', label: 'Quick Follow-up Email' },
        { day: 1, type: 'call', label: 'Next Morning Call' },
        { day: 1, type: 'linkedin', label: 'LinkedIn Message' },
        { day: 2, type: 'call', label: 'Close Call' },
        { day: 3, type: 'email', label: 'Last Touch Email' },
    ],
};

export const CADENCE_TEMPLATES: CadenceTemplate[] = [COLD_14DAY, WARM_FAST];

export const TOUCH_TYPE_CONFIG = {
    call: { icon: 'Phone', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    email: { icon: 'Send', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    linkedin: { icon: 'Linkedin', color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/40' },
} as const;

/** Calculate which touches are due today or overdue given the cadence start date */
export function getCadenceTasks(
    cadence: { type: string; startedAt: string; touches: { day: number; type: string; completed: boolean; completedAt?: string }[] } | undefined
) {
    if (!cadence?.startedAt || !cadence.touches) return { due: [], overdue: [], upcoming: [], progress: 0 };

    const start = new Date(cadence.startedAt);
    const now = new Date();
    const elapsedDays = Math.floor((now.getTime() - start.getTime()) / 86400000);

    const template = CADENCE_TEMPLATES.find(t => t.key === cadence.type);
    const due: typeof cadence.touches = [];
    const overdue: typeof cadence.touches = [];
    const upcoming: typeof cadence.touches = [];

    cadence.touches.forEach((touch, idx) => {
        if (touch.completed) return;
        const touchMeta = template?.touches[idx];
        const touchDay = touchMeta?.day ?? touch.day;
        if (touchDay < elapsedDays) overdue.push(touch);
        else if (touchDay === elapsedDays) due.push(touch);
        else upcoming.push(touch);
    });

    const completedCount = cadence.touches.filter(t => t.completed).length;
    const progress = cadence.touches.length > 0 ? Math.round((completedCount / cadence.touches.length) * 100) : 0;

    return { due, overdue, upcoming, progress };
}
