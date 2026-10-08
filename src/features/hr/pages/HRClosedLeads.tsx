'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHRClosedLeads } from '@/hooks/useApi';
import { Search, CheckCircle2, UserPlus, Phone, Calendar, Building2, Loader2 } from 'lucide-react';
import KPICard from '@/components/common/KPICard';

export default function HRClosedLeads() {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const { data: leads = [], isLoading } = useHRClosedLeads({
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalCalls = leads.reduce((s: number, l: any) => s + (l.totalCalls || 0), 0);

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground shimmer-text">Closed Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete archive of all closed deals with full attribution history</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="animate-slide-up stagger-1">
          <KPICard title="Total Closed" value={leads.length} icon={CheckCircle2} variant="success" />
        </div>
        <div className="animate-slide-up stagger-2">
          <KPICard title="Total Calls Made" value={totalCalls} icon={Phone} />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md animate-slide-up stagger-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search closed leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Closed Leads Table */}
      <div className="rounded-xl border border-border bg-card shadow-card p-6 animate-slide-up stagger-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Closed Leads Archive ({leads.length})</h2>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No closed leads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold text-muted-foreground">Lead</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Company</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Added By</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Called By</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Closed By</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Closed Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: any, idx: number) => (
                  <tr
                    key={lead.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.companyName || '—'}
                      </div>
                    </td>
                    <td className="py-3">
                      {lead.uploadedBy ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          <UserPlus className="h-3 w-3" />
                          {lead.uploadedBy?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      {lead.callAgents?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.callAgents.map((agent: string) => (
                            <span
                              key={agent}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                            >
                              <Phone className="h-3 w-3" />
                              {agent}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No calls</span>
                      )}
                    </td>
                    <td className="py-3">
                      {lead.assignedTo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {lead.assignedTo?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      {lead.wonDate ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.wonDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {selectedLead?.firstName} {selectedLead?.lastName} — Closed Lead Details
            </DialogTitle>
          </DialogHeader>
          {selectedLead && <ClosedLeadDetailContent lead={selectedLead} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClosedLeadDetailContent({ lead }: { lead: any }) {
  return (

    <div className="space-y-6">
      {/* Lead Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Name" value={`${lead.firstName} ${lead.lastName}`} />
          <InfoRow label="Email" value={lead.email} />
          <InfoRow label="Company" value={lead.companyName} />
          <InfoRow label="Phone" value={lead.phone} />
          <InfoRow label="City" value={lead.city} />
          <InfoRow label="State" value={lead.state} />
          <InfoRow label="Source" value={lead.source} />
        </div>
      </div>

      {/* Attribution */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Attribution</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-blue-50/50 p-3 text-center">
            <UserPlus className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Uploaded By</p>
            <p className="text-sm font-medium">{lead.uploadedBy?.name || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-violet-50/50 p-3 text-center">
            <Phone className="h-4 w-4 text-violet-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Called By</p>
            <p className="text-sm font-medium">{lead.callAgents?.join(', ') || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-emerald-50/50 p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <p className="text-sm font-medium">{lead.assignedTo?.name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Call History */}
      {lead.callHistory?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Call History ({lead.callHistory.length})</h3>
          <div className="space-y-2">
            {lead.callHistory.map((call: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted/30 transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{call.userId?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(call.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  Completed
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {lead.activities?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Activity Log</h3>
          <div className="space-y-2">
            {lead.activities.map((act: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted/30 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground">{act.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {act.agent} · {act.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
