'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLeads } from '@/hooks/useApi';

const PAGE_SIZE = 25;

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isClosedWon = (status?: string) => {
  if (!status) {
    return false;
  }

  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'closed won' ||
    normalized === 'active account' ||
    normalized === 'active account (closed won)'
  );
};

export default function ActiveAccountsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const pathname = usePathname() ?? '';
  const basePath = pathname.startsWith('/sdr') ? '/sdr' : '/admin';

  const activeAccounts = useMemo(
    () => leads.filter((lead: any) => isClosedWon(lead.status)),
    [leads],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeAccounts;
    }

    return activeAccounts.filter((lead: any) => {
      const companyName = (lead.companyName ?? '').toLowerCase();
      const contactName = (lead.name ?? '').toLowerCase();
      const vaName = (lead.assignedVA ?? lead.assignedVa ?? lead.assignedAgent ?? '').toLowerCase();
      return (
        companyName.includes(query) ||
        contactName.includes(query) ||
        vaName.includes(query)
      );
    });
  }, [activeAccounts, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Active Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} of {activeAccounts.length} closed won accounts
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search accounts..."
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">VA</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active Service Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contract Sign Date</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((lead: any) => {
                const id = lead.id ?? lead._id;
                return (
                  <tr key={id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      {id ? (
                        <Link
                          href={`${basePath}/leads/${id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {lead.companyName || '—'}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{lead.companyName || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{lead.name || '—'}</td>
                    <td className="px-4 py-3 text-foreground">
                      {lead.assignedVA ?? lead.assignedVa ?? lead.assignedAgent ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground">{formatDate(lead.activeServiceDate)}</td>
                    <td className="px-4 py-3 text-foreground">{formatDate(lead.contractSignDate)}</td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No active accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((previous) => previous - 1)}
            >
              Previous
            </button>
            <span className="text-sm font-medium text-foreground">
              {safePage} / {totalPages}
            </span>
            <button
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}