'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  leadsUploaded: number;
  leadsAssigned: number;
  callsMade: number;
  meetingsBooked: number;
  followUpsPending: number;
  activeAccounts: number;
  activeAccountsSourced: number;
}

interface AgentPerformanceCardProps {
  agent: Agent;
  index: number;
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:    'bg-primary/10 text-primary border-primary/20',
  manager:  'bg-primary/10 text-primary border-primary/20',
  sdr:      'bg-secondary text-muted-foreground border-border',
  closer:   'bg-secondary text-muted-foreground border-border',
  lead_gen: 'bg-secondary text-muted-foreground border-border',
  hr:       'bg-secondary text-muted-foreground border-border',
};

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center flex-1 py-2 px-1">
      <span className="text-base font-bold text-foreground tabular-nums leading-none">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-1 whitespace-nowrap leading-none">
        {label}
      </span>
    </div>
  );
}

function getStats(agent: Agent): Array<{ value: number; label: string }> {
  switch (agent.role) {
    case 'lead_gen':
      return [
        { value: agent.leadsUploaded,        label: 'Leads Added' },
        { value: agent.activeAccountsSourced, label: 'Converted'  },
      ];
    case 'sdr':
      return [
        { value: agent.callsMade,       label: 'Calls'      },
        { value: agent.meetingsBooked,  label: 'Meetings'   },
        { value: agent.followUpsPending, label: 'Follow-Ups' },
      ];
    case 'closer':
      return [
        { value: agent.leadsAssigned,  label: 'Leads' },
        { value: agent.callsMade,      label: 'Calls' },
        { value: agent.activeAccounts, label: 'Won'   },
      ];
    default:
      // admin, manager, hr
      return [
        { value: agent.leadsAssigned, label: 'Leads' },
        { value: agent.callsMade,     label: 'Calls' },
      ];
  }
}

export function AgentPerformanceCard({ agent, index }: AgentPerformanceCardProps) {
  const initials = agent.avatar && agent.avatar.length <= 2
    ? agent.avatar
    : agent.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const badgeClass = ROLE_BADGE_CLASS[agent.role] ?? ROLE_BADGE_CLASS.hr;
  const stats = getStats(agent);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
      }}
      className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{agent.name}</p>
          <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium uppercase tracking-wider mt-0.5 ${badgeClass}`}>
            {agent.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Stat strip */}
      <div className="flex divide-x divide-border border-t border-border bg-secondary/20">
        {stats.map((s) => (
          <StatBox key={s.label} value={s.value} label={s.label} />
        ))}
      </div>
    </motion.div>
  );
}
