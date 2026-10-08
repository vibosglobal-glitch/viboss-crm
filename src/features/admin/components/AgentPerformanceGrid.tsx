'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AgentPerformanceCard } from './AgentPerformanceCard';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

interface AgentPerformanceGridProps {
  agents: any[];
}

export function AgentPerformanceGrid({ agents }: AgentPerformanceGridProps) {
  const router = useRouter();

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-border bg-card/50 text-center animate-in fade-in duration-500">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <span className="text-2xl opacity-50">👥</span>
        </div>
        <h3 className="text-base font-bold text-foreground">No team members yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Start building your sales organization by inviting your first team member.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/team')}
          className="mt-6 rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold"
        >
          Manage Team
        </Button>
      </div>
    );
  }

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => a.name.localeCompare(b.name)),
    [agents]
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {sortedAgents.map((agent: any, idx: number) => (
          <AgentPerformanceCard
            key={agent.id || agent._id || idx}
            agent={{
              id: agent.id || agent._id,
              name: agent.name,
              role: agent.role,
              avatar: agent.avatar,
              leadsUploaded: agent.leadsUploaded ?? 0,
              leadsAssigned: agent.leadsAssigned ?? 0,
              callsMade: agent.callsMade ?? 0,
              meetingsBooked: agent.meetingsBooked ?? 0,
              followUpsPending: agent.followUpsPending ?? 0,
              activeAccounts: agent.activeAccounts ?? 0,
              activeAccountsSourced: agent.activeAccountsSourced ?? 0,
            }}
            index={idx}
          />
        ))}
      </div>
    </motion.div>
  );
}
