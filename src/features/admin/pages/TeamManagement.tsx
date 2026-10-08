'use client';
import { useAgents, useLeads, useCreateAgent, useDeleteAgent } from '@/hooks/useApi';
import { Phone, CheckCircle, Clock, Users, Search, UserPlus, Mail, Trash2, Loader2, X, DollarSign, ChevronRight, CalendarCheck, ClipboardCheck, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-primary text-primary-foreground' },
  manager: { label: 'Manager', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  sdr: { label: 'SDR Agent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  closer: { label: 'Closer', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  hr: { label: 'HR', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  lead_gen: { label: 'Lead Gen', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
};

function formatCompactCurrency(value?: number) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}m`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function getAgentLeadPreview(agent: any, leads: any[]) {
  if (agent.role === 'lead_gen') {
    return {
      title: 'Uploaded Leads',
      leads: leads.filter((lead: any) => lead.uploader?.id === agent.id || lead.uploadedBy?.id === agent.id || lead.addedBy === agent.name),
    };
  }

  if (agent.role === 'sdr' || agent.role === 'closer') {
    return {
      title: 'Assigned Leads',
      leads: leads.filter((lead: any) => lead.assignedTo?.id === agent.id || lead.assignedTo?._id === agent.id),
    };
  }

  const touched = leads.filter((lead: any) =>
    lead.assignedTo?.id === agent.id
    || lead.assignedTo?._id === agent.id
    || lead.uploader?.id === agent.id
    || lead.uploadedBy?.id === agent.id
    || lead.addedBy === agent.name
  );

  return {
    title: 'Lead Portfolio',
    leads: touched,
  };
}

function getPerformanceHeading(role: string) {
  switch (role) {
    case 'lead_gen':
      return 'Sourcing Performance';
    case 'sdr':
    case 'closer':
      return 'Sales Performance';
    default:
      return 'Activity Snapshot';
  }
}

function getAgentRosterSummary(agent: any) {
  if (agent.role === 'lead_gen') {
    return `${agent.leadsUploaded ?? 0} uploaded, ${agent.leadsDistributed ?? 0} routed, ${agent.activeAccountsSourced ?? 0} active accounts`;
  }

  if (agent.role === 'sdr' || agent.role === 'closer') {
    return `${agent.callsMade ?? 0} calls, ${agent.meetingsBooked ?? 0} meetings, ${agent.followUpsPending ?? 0} follow-ups pending`;
  }

  return `${agent.activitiesLogged ?? 0} activities, ${agent.followUpsCompleted ?? 0} follow-ups completed, ${agent.leadsUploaded ?? 0} leads uploaded`;
}

function getAgentRosterHighlights(agent: any) {
  if (agent.role === 'lead_gen') {
    return [
      { icon: UserPlus, label: 'Uploaded', value: agent.leadsUploaded ?? 0, color: 'text-primary' },
      { icon: CalendarCheck, label: 'Appointments', value: agent.appointmentsSetSourced ?? 0, color: 'text-amber-500' },
      { icon: DollarSign, label: 'Influenced', value: formatCompactCurrency(agent.revenueInfluenced), color: 'text-emerald-600' },
    ];
  }

  if (agent.role === 'sdr' || agent.role === 'closer') {
    return [
      { icon: Phone, label: 'Calls', value: agent.callsMade ?? 0, color: 'text-blue-500' },
      { icon: CalendarCheck, label: 'Meetings', value: agent.meetingsBooked ?? 0, color: 'text-amber-500' },
      { icon: ClipboardCheck, label: 'Follow-ups Done', value: agent.followUpsCompleted ?? 0, color: 'text-emerald-500' },
    ];
  }

  return [
    { icon: Activity, label: 'Activities', value: agent.activitiesLogged ?? 0, color: 'text-primary' },
    { icon: ClipboardCheck, label: 'Done', value: agent.followUpsCompleted ?? 0, color: 'text-emerald-500' },
    { icon: Clock, label: 'Pending', value: agent.followUpsPending ?? 0, color: (agent.followUpsPending ?? 0) > 10 ? 'text-destructive' : 'text-amber-500' },
  ];
}

function getAgentStatCards(agent: any) {
  if (agent.role === 'lead_gen') {
    return [
      { icon: UserPlus, label: 'Leads Uploaded', value: agent.leadsUploaded ?? 0, color: 'text-primary' },
      { icon: Users, label: 'Leads Routed', value: agent.leadsDistributed ?? 0, color: 'text-blue-500' },
      { icon: CalendarCheck, label: 'Appointments Set', value: agent.appointmentsSetSourced ?? 0, color: 'text-amber-500' },
      { icon: CheckCircle, label: 'Active Accounts', value: agent.activeAccountsSourced ?? 0, color: 'text-emerald-500' },
      { icon: Activity, label: 'Activities Logged', value: agent.activitiesLogged ?? 0, color: 'text-purple-500' },
      { icon: DollarSign, label: 'Revenue Influenced', value: formatCompactCurrency(agent.revenueInfluenced), color: 'text-emerald-600' },
    ];
  }

  if (agent.role === 'sdr' || agent.role === 'closer') {
    return [
      { icon: Users, label: 'Leads Assigned', value: agent.leadsAssigned ?? 0, color: 'text-primary' },
      { icon: Phone, label: 'Calls Made', value: agent.callsMade ?? 0, color: 'text-blue-500' },
      { icon: CalendarCheck, label: 'Meetings Booked', value: agent.meetingsBooked ?? 0, color: 'text-amber-500' },
      { icon: Clock, label: 'Follow-ups Pending', value: agent.followUpsPending ?? 0, color: (agent.followUpsPending ?? 0) > 10 ? 'text-destructive' : 'text-amber-500' },
      { icon: ClipboardCheck, label: 'Follow-ups Done', value: agent.followUpsCompleted ?? 0, color: 'text-purple-500' },
      { icon: DollarSign, label: 'Revenue Closed', value: formatCompactCurrency(agent.revenueClosed), color: 'text-emerald-600' },
    ];
  }

  return [
    { icon: Activity, label: 'Activities Logged', value: agent.activitiesLogged ?? 0, color: 'text-primary' },
    { icon: Phone, label: 'Calls Logged', value: agent.callsMade ?? 0, color: 'text-blue-500' },
    { icon: CalendarCheck, label: 'Meetings Created', value: agent.meetingsBooked ?? 0, color: 'text-amber-500' },
    { icon: ClipboardCheck, label: 'Follow-ups Done', value: agent.followUpsCompleted ?? 0, color: 'text-emerald-500' },
    { icon: Clock, label: 'Follow-ups Pending', value: agent.followUpsPending ?? 0, color: (agent.followUpsPending ?? 0) > 10 ? 'text-destructive' : 'text-amber-500' },
    { icon: UserPlus, label: 'Leads Uploaded', value: agent.leadsUploaded ?? 0, color: 'text-purple-500' },
  ];
}

export default function TeamManagement() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: leads = [] } = useLeads();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', password: '', role: 'sdr' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const isAdmin = user?.role === 'admin';
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const filtered = agents.filter((a: any) =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
  );
  const selectedAgentCards = useMemo(() => selectedAgent ? getAgentStatCards(selectedAgent) : [], [selectedAgent]);
  const selectedAgentLeadPreview = useMemo(() => selectedAgent ? getAgentLeadPreview(selectedAgent, leads) : { title: 'Assigned Leads', leads: [] }, [selectedAgent, leads]);

  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.email || !newAgent.password) {
      toast.error('Please fill in all fields including password');
      return;
    }
    try {
      await createAgent.mutateAsync({
        name: newAgent.name,
        email: newAgent.email,
        password: newAgent.password,
        role: newAgent.role as 'admin' | 'manager' | 'sdr' | 'closer' | 'hr' | 'lead_gen',
      });
      toast.success(`${newAgent.name} added — credentials sent via email`);
      setOpenDialog(false);
      setNewAgent({ name: '', email: '', password: '', role: 'sdr' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add agent');
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAgent.mutateAsync(deleteConfirm.id);
      toast.success(`${deleteConfirm.name} removed from team`);
      setDeleteConfirm(null);
      if (selectedAgent?.id === deleteConfirm.id) setSelectedAgent(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete agent');
    }
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{agents.length} team members</p>
        </div>
        {isAdmin && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0 gap-2">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
                <DialogDescription>
                  Create a new account. Credentials will be sent via email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@ualliances.com"
                    value={newAgent.email}
                    onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newAgent.password}
                    onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">This password will be emailed to the user.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newAgent.role} onValueChange={(value) => setNewAgent({ ...newAgent, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sdr">SDR Agent</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                      <SelectItem value="lead_gen">Lead Gen</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button onClick={handleAddAgent} disabled={createAgent.isPending} className="gradient-primary border-0">
                  {createAgent.isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      </div>

      <div className="flex gap-6">
        {/* Team Roster List */}
        <div className={`${selectedAgent ? 'w-1/2 hidden md:block' : 'w-full'} transition-all duration-300`}>
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 bg-gradient-to-r from-card to-secondary/20">
              <p className="text-sm font-semibold text-foreground">{filtered.length} Members</p>
            </div>
            <div className="divide-y divide-border/50">
              {filtered.map((agent: any, idx: number) => {
                const roleConfig = ROLE_CONFIG[agent.role] || ROLE_CONFIG.sdr;
                const isSelected = selectedAgent?.id === agent.id;
                const rosterStats = getAgentRosterHighlights(agent);
                const rosterSummary = getAgentRosterSummary(agent);
                return (
                  <button
                    key={agent.id}
                    onClick={() => isAdminOrHR && setSelectedAgent(isSelected ? null : agent)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 group
                      ${isAdminOrHR ? 'cursor-pointer hover:bg-secondary/40' : 'cursor-default'}
                      ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-medium ring-2 ring-primary/20">
                      {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">{rosterSummary}</p>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {rosterStats.map((stat: any) => (
                          <div
                            key={`${agent.id}-${stat.label}`}
                            className="rounded-lg bg-secondary/45 px-2 py-1 text-left"
                          >
                            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                              <stat.icon className={`h-3 w-3 ${stat.color}`} />
                              <span className="truncate">{stat.label}</span>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${roleConfig.color}`}>
                      {roleConfig.label}
                    </Badge>
                    {isAdminOrHR && (
                      <ChevronRight className={`h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-200 ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No members match your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel (admin/HR only) */}
        <AnimatePresence mode="wait">
          {selectedAgent && isAdminOrHR && (
            <motion.div
              key={selectedAgent.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full md:w-1/2"
            >
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden sticky top-6">
                {/* Agent Header */}
                <div className="relative px-6 py-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-semibold ring-3 ring-primary/25">
                      {selectedAgent.avatar}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedAgent.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`text-xs ${ROLE_CONFIG[selectedAgent.role]?.color}`}>
                          {ROLE_CONFIG[selectedAgent.role]?.label || selectedAgent.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {selectedAgent.email}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{getPerformanceHeading(selectedAgent.role)}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Personalized KPIs for {selectedAgent.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedAgentCards.map((stat: any) => (
                      <div key={stat.label} className="rounded-xl bg-secondary/40 p-3 text-center hover:bg-secondary/60 transition-colors">
                        <stat.icon className={`h-4 w-4 mx-auto mb-1.5 ${stat.color}`} />
                        <p className="text-lg font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Assigned Leads Preview */}
                  {(() => {
                    const agentLeads = selectedAgentLeadPreview.leads;
                    if (agentLeads.length === 0) return null;
                    return (
                      <div className="pt-2">
                        <h3 className="text-sm font-semibold text-foreground mb-2">{selectedAgentLeadPreview.title}</h3>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {agentLeads.slice(0, 8).map((lead: any) => (
                            <div key={lead.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{lead.companyName}</p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0 ml-2">{lead.status}</Badge>
                            </div>
                          ))}
                          {agentLeads.length > 8 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              +{agentLeads.length - 8} more leads
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  {isAdmin && (
                    <div className="pt-3 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setDeleteConfirm({ id: selectedAgent.id, name: selectedAgent.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Remove from Team
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAgent}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
