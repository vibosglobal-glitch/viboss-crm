'use client';
import { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Edit2, Clock, User, Link2, X, CheckCircle, XCircle, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardTableSkeleton } from '@/components/common/DashboardSkeletons';
import { useMeetings, useCreateMeeting, useDeleteMeeting, useUpdateMeeting, useLeads } from '@/hooks/useApi';
import { toast } from 'sonner';
import { LeadCombobox } from '@/components/common/LeadCombobox';

const PAGE_SIZE = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type MeetingFormData = {
    title: string;
    description: string;
    date: string;
    time: string;
    duration: number;
    leadId: string;
    leadName: string;
    agenda: string;
    confirmationSent: boolean;
    nextStep: string;
    outcome: string;
    ams: string;
    driveLink: string;
};

const emptyForm: MeetingFormData = {
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 30,
    leadId: '',
    leadName: '',
    agenda: '',
    confirmationSent: false,
    nextStep: '',
    outcome: '',
    ams: '',
    driveLink: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract YYYY-MM-DD from scheduledAt ISO string or date string */
function toDateStr(scheduledAt?: string): string {
    if (!scheduledAt) return '';
    return scheduledAt.slice(0, 10);
}

/** Format a scheduledAt datetime for display */
function formatDate(scheduledAt?: string): string {
    if (!scheduledAt) return '—';
    return new Date(scheduledAt).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
}

/** Extract HH:MM from a time string like "09:30 (America/New_York)" or "09:30" */
function parseTimeStr(rawTime?: string): string {
    if (!rawTime) return '';
    return rawTime.slice(0, 5);
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
    const { data: meetings = [], isLoading } = useMeetings();
    const { data: leads = [] } = useLeads();
    const createMeeting = useCreateMeeting();
    const deleteMeeting = useDeleteMeeting();
    const updateMeeting = useUpdateMeeting();

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<MeetingFormData>({ ...emptyForm });
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'completed' | 'cancelled'>('upcoming');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const todayStr = new Date().toISOString().split('T')[0];

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = meetings.length;
        const todayCount = meetings.filter((m: any) => toDateStr(m.scheduledAt) === todayStr).length;
        const upcomingCount = meetings.filter((m: any) => toDateStr(m.scheduledAt) >= todayStr && m.status === 'scheduled').length;
        const completedCount = meetings.filter((m: any) => m.status === 'completed').length;
        return { total, todayCount, upcomingCount, completedCount };
    }, [meetings, todayStr]);

    // ── Filtered + searched list ──────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...meetings] as any[];
        if (filter === 'today') {
            list = list.filter((m: any) => toDateStr(m.scheduledAt) === todayStr);
        } else if (filter === 'upcoming') {
            list = list.filter((m: any) => toDateStr(m.scheduledAt) >= todayStr && m.status === 'scheduled');
        } else if (filter === 'completed') {
            list = list.filter((m: any) => m.status === 'completed');
        } else if (filter === 'cancelled') {
            list = list.filter((m: any) => m.status === 'cancelled');
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((m: any) =>
                m.title?.toLowerCase().includes(q) ||
                m.leadName?.toLowerCase().includes(q) ||
                m.lead?.company?.toLowerCase().includes(q) ||
                m.createdByName?.toLowerCase().includes(q) ||
                m.description?.toLowerCase().includes(q)
            );
        }
        return list.sort((a: any, b: any) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
    }, [meetings, filter, search, todayStr]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const changeFilter = (f: typeof filter) => { setFilter(f); setPage(1); };
    const changeSearch = (q: string) => { setSearch(q); setPage(1); };

    const openNew = () => {
        setForm({ ...emptyForm });
        setEditId(null);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.title || !form.date || !form.time) return;
        let leadName = form.leadName;
        if (form.leadId) {
            const lead = (leads as any[]).find(l => l.id === form.leadId);
            leadName = lead?.name || '';
        }
        try {
            if (editId) {
                await updateMeeting.mutateAsync({ id: editId, data: { ...form, leadName } });
                toast.success('Meeting updated');
            } else {
                await createMeeting.mutateAsync({ ...form, leadName });
                toast.success('Meeting scheduled');
            }
            setForm({ ...emptyForm });
            setShowForm(false);
            setEditId(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save meeting');
        }
    };

    const handleEdit = (meeting: any) => {
        setForm({
            title: meeting.title || '',
            description: meeting.description || '',
            date: toDateStr(meeting.scheduledAt),
            time: parseTimeStr(meeting.time),
            duration: meeting.duration || 30,
            leadId: meeting.leadId || '',
            leadName: meeting.leadName || '',
            agenda: meeting.agenda || '',
            confirmationSent: meeting.confirmationSent || false,
            nextStep: meeting.nextStep || '',
            outcome: meeting.outcome || '',
            ams: meeting.ams || '',
            driveLink: meeting.driveLink || '',
        });
        setEditId(meeting.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this meeting?')) return;
        try {
            await deleteMeeting.mutateAsync(id);
            toast.success('Meeting deleted');
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await updateMeeting.mutateAsync({ id, data: { status } });
            toast.success(`Marked as ${status}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update');
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-36 rounded-lg bg-muted animate-pulse" />
                        <div className="h-4 w-52 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="h-10 w-40 rounded-lg bg-muted animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
                </div>
                <DashboardTableSkeleton rows={5} cols={4} />
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {stats.upcomingCount} upcoming · {stats.todayCount} today
                    </p>
                </div>
                <Button onClick={openNew} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                </Button>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-foreground' },
                    { label: 'Today', value: stats.todayCount, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Upcoming', value: stats.upcomingCount, color: 'text-primary' },
                    { label: 'Completed', value: stats.completedCount, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-card">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter Tabs + Search ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-0">
                <div className="flex flex-wrap gap-1.5">
                    {([
                        { key: 'upcoming', label: 'Upcoming', count: stats.upcomingCount },
                        { key: 'today', label: 'Today', count: stats.todayCount },
                        { key: 'all', label: 'All', count: stats.total },
                        { key: 'completed', label: 'Completed', count: stats.completedCount },
                        { key: 'cancelled', label: 'Cancelled', count: meetings.filter((m: any) => m.status === 'cancelled').length },
                    ] as const).map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => changeFilter(key)}
                            className={`relative pb-3 px-3 text-sm font-medium transition-colors ${
                                filter === key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    filter === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {count}
                                </span>
                            )}
                            {filter === key && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="relative mb-1 w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => changeSearch(e.target.value)}
                        placeholder="Search meetings..."
                        className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {search && (
                        <button
                            onClick={() => changeSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Schedule Form ── */}
            {showForm && (
                <div className="rounded-xl border border-border bg-card shadow-card">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">
                            {editId ? 'Edit Meeting' : 'Schedule New Meeting'}
                        </h2>
                        <button
                            onClick={() => { setShowForm(false); setEditId(null); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
                            <input
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Discovery Call with Acme Corp"
                            />
                        </div>
                        {/* Date & Time */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date *</label>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time *</label>
                            <div className="flex gap-2">
                                <input
                                    type="time"
                                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                                    value={form.time}
                                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <label className="text-xs text-muted-foreground whitespace-nowrap">Duration</label>
                                    <input
                                        type="number"
                                        className="w-16 h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                                        value={form.duration}
                                        onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) || 30 }))}
                                    />
                                    <span className="text-xs text-muted-foreground">min</span>
                                </div>
                            </div>
                        </div>
                        {/* Lead */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Linked Lead</label>
                            <LeadCombobox
                                value={form.leadId}
                                initialName={form.leadName}
                                onSelect={(id, name) => setForm(f => ({ ...f, leadId: id, leadName: name }))}
                            />
                        </div>
                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prep Notes</label>
                            <textarea
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground min-h-[64px] resize-none"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Internal notes before the meeting..."
                            />
                        </div>
                        {/* Agenda */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Agenda</label>
                            <textarea
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none"
                                value={form.agenda}
                                onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                                placeholder={"1. Introductions\n2. Pain points\n3. Solution overview\n4. Next steps"}
                            />
                        </div>
                        {/* Confirmation */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="confirmationSent"
                                checked={form.confirmationSent}
                                onChange={e => setForm(f => ({ ...f, confirmationSent: e.target.checked }))}
                                className="h-4 w-4 rounded border-input text-primary"
                            />
                            <label htmlFor="confirmationSent" className="text-sm text-foreground cursor-pointer select-none">
                                Confirmation sent to prospect
                            </label>
                        </div>
                        {/* Edit-only fields */}
                        {editId && (
                            <>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Outcome / Notes</label>
                                        <textarea
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground min-h-[64px] resize-none"
                                            value={form.outcome}
                                            onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                                            placeholder="What happened? What was agreed?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Next Step</label>
                                        <input
                                            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                                            value={form.nextStep}
                                            onChange={e => setForm(f => ({ ...f, nextStep: e.target.value }))}
                                            placeholder="What happens next?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recording Link</label>
                                        <input
                                            type="url"
                                            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                                            value={form.driveLink}
                                            onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))}
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
                        <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!form.title || !form.date || !form.time || createMeeting.isPending || updateMeeting.isPending}
                        >
                            {createMeeting.isPending || updateMeeting.isPending ? 'Saving...' : editId ? 'Update Meeting' : 'Schedule Meeting'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Meetings List ── */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-16 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">
                        {search ? `No results for "${search}"` : 'No meetings found'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {search ? 'Try a different search term' : filter !== 'all' ? 'Try switching to All Meetings' : 'Schedule your first meeting above'}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                    <div className="divide-y divide-border">
                        {paginated.map((meeting: any) => {
                            const statusCfg = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.scheduled;
                            const dateStr = toDateStr(meeting.scheduledAt);
                            const isToday = dateStr === todayStr;
                            const isPast = dateStr < todayStr && meeting.status === 'scheduled';

                            return (
                                <div key={meeting.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                                    {/* Date column */}
                                    <div className={`flex flex-col items-center justify-center rounded-lg shrink-0 w-12 h-12 text-center ${
                                        isToday ? 'bg-primary text-primary-foreground' :
                                        isPast ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                        'bg-secondary text-foreground'
                                    }`}>
                                        <span className="text-[10px] font-semibold uppercase leading-none">
                                            {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleDateString('en-US', { month: 'short' }) : '—'}
                                        </span>
                                        <span className="text-lg font-bold leading-tight">
                                            {meeting.scheduledAt ? new Date(meeting.scheduledAt).getDate() : '—'}
                                        </span>
                                    </div>

                                    {/* Main content */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-semibold text-foreground">{meeting.title}</h3>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.className}`}>
                                                {statusCfg.label}
                                            </span>
                                            {isToday && meeting.status === 'scheduled' && (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary">
                                                    Today
                                                </span>
                                            )}
                                            {isPast && (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                    Overdue
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                {formatDate(meeting.scheduledAt)}
                                            </span>
                                            {meeting.time && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                                    {parseTimeStr(meeting.time)}
                                                    {meeting.duration ? ` · ${meeting.duration}min` : ''}
                                                </span>
                                            )}
                                            {meeting.leadName && (
                                                <span className="flex items-center gap-1">
                                                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                                                    {meeting.leadName}
                                                    {meeting.lead?.company ? ` · ${meeting.lead.company}` : ''}
                                                </span>
                                            )}
                                            {meeting.createdByName && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5 shrink-0" />
                                                    {meeting.createdByName}
                                                </span>
                                            )}
                                        </div>

                                        {meeting.description && (
                                            <p className="text-xs text-muted-foreground">{meeting.description}</p>
                                        )}

                                        {meeting.agenda && (
                                            <div className="rounded-md bg-secondary/40 px-3 py-2">
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agenda</p>
                                                <p className="text-xs text-foreground whitespace-pre-line">{meeting.agenda}</p>
                                            </div>
                                        )}

                                        {meeting.status === 'completed' && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                {meeting.outcome && (
                                                    <p className="text-xs text-foreground">
                                                        <span className="font-medium text-muted-foreground">Outcome: </span>
                                                        {meeting.outcome}
                                                    </p>
                                                )}
                                                {meeting.nextStep ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-foreground">
                                                            <span className="font-medium">Next step: </span>{meeting.nextStep}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 rounded-md border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 w-fit">
                                                        <XCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">No next step — edit to add one</p>
                                                    </div>
                                                )}
                                                {meeting.driveLink && (
                                                    <a
                                                        href={meeting.driveLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-primary hover:underline flex items-center gap-1 w-fit"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                        View Recording
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                        {meeting.status === 'scheduled' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(meeting.id, 'completed')}
                                                    title="Mark completed"
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(meeting.id, 'cancelled')}
                                                    title="Cancel meeting"
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleEdit(meeting)}
                                            title="Edit"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(meeting.id)}
                                            title="Delete"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Pagination footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                            <p className="text-xs text-muted-foreground">
                                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                                    .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                                        if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((n, i) =>
                                        n === '...' ? (
                                            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                                        ) : (
                                            <button
                                                key={n}
                                                onClick={() => setPage(n as number)}
                                                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                                                    safePage === n
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        )
                                    )
                                }
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
