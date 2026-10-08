'use client';
import { useState } from 'react';
import { Mail, Send, CalendarDays, Loader2, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOutreachStats, useLogOutreach } from '@/hooks/useApi';
import { toast } from 'sonner';

export default function EmailOutreachPage() {
    const { data: stats, isLoading: statsLoading } = useOutreachStats();
    const logOutreachDetails = useLogOutreach();

    const [countInput, setCountInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const todayEmails = stats?.todayEmails ?? 0;
    const totalEmails = stats?.totalEmails ?? 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const count = parseInt(countInput, 10);

        if (isNaN(count) || count <= 0) {
            toast.error('Please enter a valid number of emails sent.');
            return;
        }

        setIsSubmitting(true);
        try {
            await logOutreachDetails.mutateAsync(count);
            toast.success(`Successfully logged ${count} emails sent!`);
            setCountInput('');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to log emails. Please try again.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const metricCards = [
        {
            label: 'Emails Sent Today',
            value: stats?.todayEmails ?? 0,
            icon: CalendarDays,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950',
            subtext: stats?.todayDate || new Date().toISOString().split('T')[0]
        },
        {
            label: 'Total Emails All Time',
            value: stats?.totalEmails ?? 0,
            icon: Mail,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-950',
            subtext: 'Across entire history'
        },
    ];

    return (
        <div className="space-y-5 md:space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Email Outreach Tracking</h1>
                    <p className="text-muted-foreground mt-1.5 text-base">Manually log your daily email outreach efforts</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    Today: {todayEmails}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    Total: {totalEmails}
                </span>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metricCards.map(stat => (
                    <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
                            <stat.icon className="w-24 h-24" />
                        </div>
                        <div className="flex items-start gap-4">
                            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} shrink-0 shadow-sm`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    {statsLoading ? (
                                        <Skeleton className="h-10 w-24" />
                                    ) : (
                                        <h2 className="text-4xl font-bold tracking-tight text-foreground">{stat.value.toLocaleString()}</h2>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Entry Form */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Log Today's Emails</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Enter the total number of new emails you sent today.</p>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="max-w-md">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="emailCount" className="block text-sm font-medium text-foreground mb-1.5">
                                    Number of Emails Sent
                                </label>
                                <div className="relative">
                                    <input
                                        id="emailCount"
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="e.g. 15"
                                        value={countInput}
                                        onChange={(e) => setCountInput(e.target.value)}
                                        className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                        disabled={isSubmitting || statsLoading}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pr-2">
                                        emails
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full text-base h-12 rounded-xl gradient-primary font-semibold shadow-md hover:shadow-lg transition-all"
                                disabled={isSubmitting || !countInput || statsLoading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Logging...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-5 w-5" />
                                        Add to Today's Count
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Need to send cold emails?</h3>
                        <p className="text-sm text-muted-foreground">Use a dedicated outreach tool for large campaigns.</p>
                    </div>
                </div>
                <Button variant="outline" className="shrink-0 group" asChild>
                    <a href="https://app.instantly.ai/app/campaigns">
                        Go to Email Campaign Manager <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                </Button>
            </div>
        </div>
    );
}
