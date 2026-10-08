'use client';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Play, Download, Clock, User, FileText, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCall, useCalls } from '@/hooks/useApi';

const statusColors: Record<string, string> = {
  'Completed': 'bg-success/10 text-success border-success/20',
  'Missed': 'bg-destructive/10 text-destructive border-destructive/20',
  'Follow-up': 'bg-warning/10 text-warning border-warning/20',
};

export default function CallDetailPage() {
  const params = useParams();
  const callId = params?.callId as string | undefined;
  const { data: call, isLoading } = useCall(callId ?? '');
  const { data: allCalls = [] } = useCalls();
  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/sdr') ? '/sdr' :
    pathname.startsWith('/hr') ? '/hr' :
      pathname.startsWith('/leadgen') ? '/leadgen' : '/admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold text-foreground mb-2">Call not found</h2>
        <Link href={`${basePath}/calls`}><Button variant="outline">Back to Calls</Button></Link>
      </div>
    );
  }

  const relatedCalls = allCalls.filter((c: any) => c.leadId === call.leadId && c.id !== call.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`${basePath}/calls`}>
          <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
          <p className="text-sm text-muted-foreground">Call with {call.leadName}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Call Info Card */}
        <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Call Information</h3>
          <div className="space-y-3">
            {[
              { icon: User, label: 'Lead', value: call.leadName, link: `${basePath}/leads/${call.leadId}` },
              { icon: User, label: 'Agent', value: call.agentName },
              { icon: Calendar, label: 'Date', value: `${call.date} at ${call.time}` },
              { icon: Clock, label: 'Duration', value: call.duration },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.link ? (
                    <Link href={item.link} className="text-sm font-medium text-primary hover:underline">{item.value}</Link>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[call.status]}`}>
                  {call.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Recording Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Notes
            </h3>
            <p className="text-sm text-muted-foreground">{call.notes || 'No notes added.'}</p>
          </div>

          {call.hasRecording && (
            <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Recording</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <Button size="icon" className="h-10 w-10 rounded-full gradient-primary border-0">
                  <Play className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <div className="h-1.5 bg-border rounded-full">
                    <div className="h-1.5 bg-primary rounded-full w-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">0:00 / {call.duration}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related calls */}
      {relatedCalls.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Other calls with {call.leadName}</h3>
          <div className="space-y-3">
            {relatedCalls.map(rc => (
              <Link key={rc.id} href={`${basePath}/calls/${rc.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${rc.status === 'Completed' ? 'bg-success/10 text-success' : rc.status === 'Missed' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{rc.date} at {rc.time} — {rc.duration}</p>
                  <p className="text-xs text-muted-foreground">{rc.notes}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[rc.status]}`}>
                  {rc.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
