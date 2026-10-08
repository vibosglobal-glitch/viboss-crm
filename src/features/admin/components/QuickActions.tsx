'use client';

import React from 'react';
import { Plus, UserPlus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onAddLead: () => void;
  onInviteUser: () => void;
  onImportLeads: () => void;
  onExportReport: () => void;
}

export function QuickActions({
  onAddLead,
  onInviteUser,
  onImportLeads,
  onExportReport
}: QuickActionsProps) {
  const actions = [
    {
      label: 'Add Lead',
      description: 'Create individual lead',
      icon: Plus,
      onClick: onAddLead,
      color: 'bg-primary/10 text-primary hover:bg-primary/20 bg-gradient-to-br from-primary/20 to-primary/5',
      id: "add-lead-btn"
    },
    {
      label: 'Invite User',
      description: 'Add team member',
      icon: UserPlus,
      onClick: onInviteUser,
      color: 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 bg-gradient-to-br from-violet-500/20 to-violet-500/5 border-violet-500/10',
      id: "invite-user-btn"
    },
    {
      label: 'Import CSV',
      description: 'Bulk upload leads',
      icon: Upload,
      onClick: onImportLeads,
      color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/10',
      id: "import-csv-btn"
    },
    {
      label: 'Export Data',
      description: 'Download full report',
      icon: Download,
      onClick: onExportReport,
      color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/10',
      id: "export-report-btn"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {actions.map((action, i) => (
        <Button
          id={action.id}
          key={action.label}
          variant="ghost"
          className={`h-auto p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-transparent shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group animate-in slide-in-from-bottom-2 duration-500 ${action.color}`}
          style={{ animationDelay: `${i * 100}ms` }}
          onClick={action.onClick}
        >
          <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-background transition-all duration-300 shadow-sm">
            <action.icon className="h-5 w-5" />
          </div>
          <div className="text-center">
            <span className="text-sm font-bold block">{action.label}</span>
            <span className="text-[10px] opacity-70 font-medium block">{action.description}</span>
          </div>
        </Button>
      ))}
    </div>
  );
}
