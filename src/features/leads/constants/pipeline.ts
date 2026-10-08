/**
 * Pipeline stage definitions — single source of truth.
 * Import from here instead of hardcoding status strings.
 */

export const PIPELINE_STAGES = [
    { key: 'New Lead', label: 'New Lead', color: 'bg-slate-400', textColor: 'text-slate-700', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300' },
    { key: 'In Progress', label: 'In Progress', color: 'bg-blue-400', textColor: 'text-blue-700', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300' },
    { key: 'Contacted', label: 'Contacted', color: 'bg-cyan-400', textColor: 'text-cyan-700', badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-300' },
    { key: 'Appointment Set', label: 'Appointment Set', color: 'bg-amber-400', textColor: 'text-amber-700', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300' },
    { key: 'Active Account', label: 'Active Account', color: 'bg-emerald-500', textColor: 'text-emerald-700', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300' },
] as const;

/** All valid pipeline stage keys */
export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key'];

/** All stage keys as a plain array (useful for enums / dropdowns) */
export const STAGE_KEYS = PIPELINE_STAGES.map(s => s.key);

/** Lookup helpers */
export const getStage = (key: string) => PIPELINE_STAGES.find(s => s.key === key);
export const getStageBadgeClass = (key: string) => getStage(key)?.badgeClass ?? 'bg-muted text-muted-foreground border-border';
export const getStageColor = (key: string) => getStage(key)?.color ?? 'bg-gray-400';

/** Terminal stages (no further action expected) */
export const TERMINAL_STAGES: PipelineStageKey[] = ['Active Account'];

/** Stages where meetings are relevant */
export const MEETING_STAGES: PipelineStageKey[] = ['Appointment Set'];

/** Stages that trigger auto-recording flag on calls */
export const RECORDING_FLAG_STAGES: PipelineStageKey[] = ['Active Account'];

/* ── Lead Priorities (§6) ── */
export const PRIORITIES = [
    { key: 'A', label: 'A – High', color: 'bg-red-500', badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300' },
    { key: 'B', label: 'B – Medium', color: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300' },
    { key: 'C', label: 'C – Low', color: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
] as const;
export type LeadPriority = typeof PRIORITIES[number]['key'];
export const PRIORITY_KEYS: LeadPriority[] = ['A', 'B', 'C'];
export const getPriorityBadgeClass = (key: string) => PRIORITIES.find(p => p.key === key)?.badgeClass ?? 'bg-muted text-muted-foreground border-border';

/* ── Segments ── */
export const SEGMENTS = ['Insurance', 'Accounting', 'Finance', 'Healthcare', 'Legal', 'Other'] as const;
export type LeadSegment = typeof SEGMENTS[number];

/* ── Source Channels (§4) ── */
export const SOURCE_CHANNELS = [
    'Cold – High Fit',
    'Warm – Engaged',
    'Cold – Quick Sourced',
    'Cold – Bulk Data',
    'CSV Import',
    'Manual',
    'LinkedIn',
    'Referral',
    'Other',
] as const;
export type SourceChannel = typeof SOURCE_CHANNELS[number];

/* ── Quality Gate (§5) — required fields before SDR assignment ── */
export const QUALITY_GATE_FIELDS = [
    { field: 'companyName', label: 'Company Name' },
    { field: 'websiteOrLinkedin', label: 'Website or LinkedIn URL', check: (l: any) => !!(l.website || l.companyLinkedinUrl || l.personLinkedinUrl) },
    { field: 'state', label: 'Location (State)' },
    { field: 'segment', label: 'Segment' },
    { field: 'nameOrTitle', label: 'Decision-maker Name or Title', check: (l: any) => !!(l.name && (l.title || l.name)) },
    { field: 'emailOrPhone', label: 'Valid Email or Phone', check: (l: any) => !!(l.email || l.workDirectPhone || l.mobilePhone || l.homePhone) },
    { field: 'sourceChannel', label: 'Source Channel' },
] as const;

export function checkQualityGate(lead: any): { pass: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const rule of QUALITY_GATE_FIELDS) {
        if ('check' in rule && rule.check) {
            if (!rule.check(lead)) missing.push(rule.label);
        } else {
            if (!lead[rule.field]) missing.push(rule.label);
        }
    }
    return { pass: missing.length === 0, missing };
}
