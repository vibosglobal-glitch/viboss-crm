'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, UserPlus, Info, CheckCheck, RefreshCw, PhoneCall, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/features/leads/types/leads';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/useNotifications';

const typeIcons = {
  'follow-up': Clock,
  'overdue': AlertTriangle,
  'assignment': UserPlus,
  'lead_assigned': UserPlus,
  'status_change': RefreshCw,
  'call_logged': PhoneCall,
  'meeting_scheduled': CalendarClock,
  'task_due': Clock,
  'system': Info,
};

export default function NotificationDropdown({ notifications, unreadCount }: { notifications: Notification[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-mark all as read when dropdown is opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/80 backdrop-blur-sm hover:bg-secondary hover:border-border transition-all duration-200"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-[0_0_8px_hsl(var(--destructive)/0.4)] animate-pulse-soft">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-xl border border-border bg-popover shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <span className="text-sm font-semibold text-popover-foreground">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const Icon = typeIcons[n.type as keyof typeof typeIcons] || Info;
                const isUnread = (n as any).read === false || (n as any).isRead === false;
                const timestamp = (n as any).timestamp || (n as any).createdAt || '';
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/50 ${isUnread ? 'bg-primary/[0.04]' : ''}`}>
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.type === 'overdue' ? 'bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive' : 'bg-gradient-to-br from-primary/15 to-primary/5 text-primary'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-popover-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{timestamp}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
