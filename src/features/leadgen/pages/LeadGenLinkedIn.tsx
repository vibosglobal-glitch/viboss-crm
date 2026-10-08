'use client';
import { useState, useMemo } from 'react';
import { Linkedin, ExternalLink, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeads } from '@/hooks/useApi';

export default function LeadGenLinkedIn() {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Only leads that have a LinkedIn URL
  const linkedInLeads = useMemo(() =>
    leads.filter((l: any) => l.personLinkedinUrl || l.companyLinkedinUrl)
      .filter((l: any) => {
        const q = search.toLowerCase();
        return !search || l.name?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q);
      }),
    [leads, search]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">LinkedIn Outreach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {linkedInLeads.length} leads with LinkedIn profiles (from {leads.length} total)
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {linkedInLeads.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No leads with LinkedIn URLs found. Make sure your CSV includes a "Person LinkedIn URL" column.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {linkedInLeads.map((lead: any) => (
              <div key={lead.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077b5] text-white shrink-0">
                      <Linkedin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.companyName || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.personLinkedinUrl && (
                      <a
                        href={lead.personLinkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <Linkedin className="h-3.5 w-3.5 text-[#0077b5]" />
                        Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {lead.companyLinkedinUrl && (
                      <a
                        href={lead.companyLinkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <Linkedin className="h-3.5 w-3.5 text-[#0077b5]" />
                        Company
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    >
                      {expandedId === lead.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {expandedId === lead.id ? 'Less' : 'More info'}
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === lead.id && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-muted/30 rounded-lg p-4">
                    {[
                      { label: 'Title', value: lead.title },
                      { label: 'Email', value: lead.email },
                      { label: 'Phone', value: lead.phone || lead.workDirectPhone },
                      { label: 'City', value: lead.city },
                      { label: 'State', value: lead.state },
                      { label: 'Employees', value: lead.employeeCount },
                      { label: 'Status', value: lead.status },
                      { label: 'Assigned to', value: lead.assignedAgent || 'Unassigned' },
                      { label: 'Source', value: lead.source },
                    ].map(row => (
                      <div key={row.label}>
                        <span className="text-xs text-muted-foreground block">{row.label}</span>
                        <span className="font-medium text-foreground">{row.value || '—'}</span>
                      </div>
                    ))}
                    {lead.notes && (
                      <div className="col-span-full">
                        <span className="text-xs text-muted-foreground block">Notes</span>
                        <span className="text-foreground">{lead.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
