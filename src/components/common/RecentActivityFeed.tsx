'use client';
import { UserPlus, Phone, CalendarCheck, RefreshCw, FileText, Edit, Loader2 } from 'lucide-react';
import { useActivityFeed } from '@/features/activities/hooks/useActivities';

const typeMap: Record<string, { icon: any; style: string }> = {
  call:         { icon: Phone,        style: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' },
  meeting:      { icon: CalendarCheck,style: 'bg-amber-500/10 text-amber-600 ring-amber-500/20'     },
  'stage-change':{ icon: RefreshCw,   style: 'bg-blue-500/10 text-blue-600 ring-blue-500/20'        },
  stage_change: { icon: RefreshCw,    style: 'bg-blue-500/10 text-blue-600 ring-blue-500/20'        },
  note:         { icon: FileText,     style: 'bg-muted text-muted-foreground ring-border'            },
  edit:         { icon: Edit,         style: 'bg-violet-500/10 text-violet-600 ring-violet-500/20'  },
  default:      { icon: UserPlus,     style: 'bg-primary/10 text-primary ring-primary/20'           },
};

function timeAgo(dateStr: string | Date): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function describeActivity(a: any): { user: string; action: string; target: string } {
  const user = a.user?.name || 'Someone';
  const lead = a.lead ? `${a.lead.firstName || ''} ${a.lead.lastName || ''}`.trim() : '';

  switch (a.type) {
    case 'call':
      return { user, action: `logged a ${a.callOutcome || 'call'} call with`, target: lead || 'a lead' };
    case 'meeting':
      return { user, action: 'scheduled a meeting with', target: lead || 'a lead' };
    case 'stage_change':
    case 'stage-change':
      return { user, action: 'Pipeline stage changed to', target: `"${a.toStage || 'new stage'}" ${lead}`.trim() };
    case 'note':
      return { user, action: 'added a note to', target: lead || 'a lead' };
    default:
      return { user, action: a.description || 'performed an action on', target: lead || '' };
  }
}

export default function RecentActivityFeed() {
  const { data: activities = [], isLoading } = useActivityFeed();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="h-[420px] overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No recent activity yet
          </div>
        ) : (
          <div className="space-y-0">
            {activities.slice(0, 20).map((activity: any, i: number) => {
              const { icon: Icon, style } = typeMap[activity.type] ?? typeMap.default;
              const { user, action, target } = describeActivity(activity);
              const isLast = i === Math.min(activities.length, 20) - 1;

              return (
                <div key={activity.id || i} className="relative flex gap-4 group">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${style} bg-card z-10 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-border/50 min-h-[20px] mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 pb-5 ${isLast ? 'pb-0' : ''}`}>
                    <p className="text-[13px] text-foreground/90 leading-snug">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {user}
                      </span>{' '}
                      <span className="text-muted-foreground">{action}</span>{' '}
                      {target && (
                        <span className="font-medium text-foreground/80">{target}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground/55 mt-1">{timeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
