'use client';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart2, Calendar, Coffee, Home,
  Layers, LogOut, Settings, StickyNote, Users, Menu, X, Clock, Phone, Shield, UserCog, CalendarCheck, ChevronDown, LogIn, Loader2, AlertTriangle
} from 'lucide-react';
import { useNotifications, useAgents } from '@/hooks/useApi';
import NotificationDropdown from '@/components/common/NotificationDropdown';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useRole } from '@/hooks/useRole';
import { ThemeToggle } from '@/components/common/ThemeToggle';

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

const adminNavItems = [
  { icon: Home, label: 'Dashboard', path: '/admin' },
  { icon: Coffee, label: 'Daily Huddle', path: '/admin/huddle' },
  { icon: BarChart2, label: 'Funnel KPIs', path: '/admin/funnel' },
  { icon: Users, label: 'Database', path: '/admin/leads' },
  { icon: Phone, label: 'All Calls', path: '/admin/calls' },
  { icon: Clock, label: 'Follow-ups', path: '/admin/follow-ups' },
  { icon: Layers, label: 'Pipeline', path: '/admin/pipeline' },
  { icon: UserCog, label: 'Team Management', path: '/admin/team' },
  { icon: Calendar, label: 'Calendar', path: '/admin/calendar' },
  { icon: CalendarCheck, label: 'Meetings', path: '/admin/meetings' },
  { icon: StickyNote, label: 'My Notes', path: '/admin/notes' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, logout, impersonate, exitImpersonation, impersonatedBy, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  useSocket();

  const { data: agentsRaw = [] } = useAgents();
  const agents = (agentsRaw as any[]).filter(
    (a) => a.role !== 'admin' && a.id !== user?.id
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const impersonateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (impersonateRef.current && !impersonateRef.current.contains(e.target as Node)) setImpersonateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { isAdmin } = useRole();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
    } else if (!isAdmin && !impersonatedBy) {
      router.replace(ROLE_REDIRECT[user.role] || '/login');
    }
  }, [user, router, isAdmin, impersonatedBy, isLoading]);

  const handleImpersonate = async (userId: string, userRole: string) => {
    setImpersonating(userId);
    try {
      const result = await impersonate(userId);
      if (result.success) router.push(ROLE_REDIRECT[userRole] || '/sdr');
    } finally {
      setImpersonating(null);
      setImpersonateOpen(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Impersonation Banner */}
      {impersonatedBy && (
        <div className="flex items-center justify-between bg-amber-500 text-white px-4 py-2 text-sm font-medium z-50 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Impersonating as <strong>{user.name}</strong> — session started by {impersonatedBy}</span>
          </div>
          <button
            onClick={exitImpersonation}
            className="flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none" />
          <div className="relative flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
            <img src="/vibos-logo.png" alt="V!BOS" width={140} height={28} className="h-7 w-auto" />
            <button className="ml-auto lg:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 px-3 py-2 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Admin Panel</span>
            </div>
          </div>
          <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {adminNavItems.map(item => {
              const active = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
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
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />}
                  <item.icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'text-sidebar-primary' : 'group-hover:scale-110'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="relative p-3 border-t border-sidebar-border">
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
              <LogOut className="h-4 w-4" />Sign Out
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="relative z-20 flex h-16 items-center justify-between border-b border-border/50 px-6 bg-card/80 backdrop-blur-md shadow-[0_1px_3px_hsl(var(--foreground)/0.04)]">
            <button className="lg:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3">
              <NotificationDropdown notifications={notifications} unreadCount={unreadCount} />

              {/* Impersonate Dropdown — hidden while in impersonated session */}
              {!impersonatedBy && (
                <div className="relative" ref={impersonateRef}>
                  <button
                    onClick={() => setImpersonateOpen(!impersonateOpen)}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                    title="Impersonate User"
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm font-medium">Switch User</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${impersonateOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {impersonateOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setImpersonateOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-slide-up">
                        <div className="px-4 py-3 border-b border-border bg-muted/30">
                          <p className="text-xs font-bold text-foreground py-1 uppercase tracking-wider">Select Team Member</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-border">
                          {agents.map((agent: any) => (
                            <button
                              key={agent.id}
                              disabled={impersonating === agent.id}
                              onClick={() => handleImpersonate(agent.id, agent.role)}
                              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium shadow-sm ${ROLE_COLORS[agent.role] || 'bg-muted'}`}>
                                {agent.avatar || agent.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
                              </div>
                              {impersonating === agent.id
                                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                : <LogIn className="h-4 w-4 text-muted-foreground" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <ThemeToggle />

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {user?.avatar || 'AD'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-foreground">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-slide-up">
                      <div className="p-1">
                        <button onClick={logout} className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                          <LogOut className="h-4 w-4" />Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
