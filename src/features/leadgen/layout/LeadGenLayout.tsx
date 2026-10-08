'use client';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Home, Users, FileSpreadsheet, LogOut, StickyNote, Zap, Menu, X, Mail, Linkedin, Target, Calendar, CalendarCheck, Settings
} from 'lucide-react';
import { useNotifications } from '@/hooks/useApi';
import NotificationDropdown from '@/components/common/NotificationDropdown';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useRole } from '@/hooks/useRole';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const leadGenNavItems = [
  { icon: Home, label: 'Dashboard', path: '/leadgen' },
  { icon: Users, label: 'Database', path: '/leadgen/leads' },
  { icon: FileSpreadsheet, label: 'CSV Upload', path: '/leadgen/upload' },
  { icon: Mail, label: 'Email Outreach', path: '/leadgen/email' },
  { icon: Linkedin, label: 'LinkedIn Outreach', path: '/leadgen/linkedin' },
  { icon: Calendar, label: 'Calendar', path: '/leadgen/calendar' },
  { icon: CalendarCheck, label: 'Meetings', path: '/leadgen/meetings' },
  { icon: StickyNote, label: 'My Notes', path: '/leadgen/notes' },
  { icon: Settings, label: 'Settings', path: '/leadgen/settings' },
];

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  manager: '/admin',
  sdr: '/sdr',
  closer: '/sdr',
  hr: '/hr',
  lead_gen: '/leadgen',
  leadgen: '/leadgen',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  manager: 'bg-orange-500 text-white',
  sdr: 'bg-blue-500 text-white',
  closer: 'bg-teal-500 text-white',
  hr: 'bg-emerald-500 text-white',
  lead_gen: 'bg-amber-500 text-white',
  leadgen: 'bg-amber-500 text-white',
};


export default function LeadGenLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, logout, impersonatedBy, exitImpersonation, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  useSocket();

  const { isLeadGen, isAdmin } = useRole();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
    } else if (!isLeadGen && !isAdmin) {
      router.replace(ROLE_REDIRECT[user.role] || '/login');
    }
  }, [user, router, isLeadGen, isAdmin, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none" />

        <div className="relative flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
          <img src="/vibos-logo.png" alt="V!BOS" width={140} height={28} className="h-7 w-auto" />
          <button className="ml-auto lg:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead Gen badge */}
        <div className="relative px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/20 px-3 py-2 backdrop-blur-sm">
            <Target className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Lead Gen Panel</span>
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {leadGenNavItems.map(item => {
            const active = pathname === item.path ||
              (item.path !== '/leadgen' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group ${active
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.15)]'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.5)]" />
                )}
                <item.icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'text-sidebar-primary' : 'group-hover:scale-110'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-3 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="relative z-20 flex h-16 items-center justify-between border-b border-border/50 px-6 bg-card/80 backdrop-blur-md shadow-[0_1px_3px_hsl(var(--foreground)/0.04)]">
          <button className="lg:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            {impersonatedBy && (
              <button
                onClick={exitImpersonation}
                className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20"
              >
                Return to Admin Panel
              </button>
            )}
            <ThemeToggle />
            <NotificationDropdown notifications={notifications} unreadCount={unreadCount} />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm font-medium ring-2 ring-amber-500/20">
                {user?.avatar || 'LG'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name || 'Lead Gen'}</p>
                <p className="text-xs text-muted-foreground">Lead Gen</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
