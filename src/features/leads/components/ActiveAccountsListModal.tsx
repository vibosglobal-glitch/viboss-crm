'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '../types/leads';

interface ActiveAccountsListModalProps {
    isOpen: boolean;
    onClose: () => void;
    leads: Lead[];
}

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function ActiveAccountsListModal({ isOpen, onClose, leads }: ActiveAccountsListModalProps) {
    const activeAccounts = leads.filter(
        (l) => {
            const status = l.status?.trim().toLowerCase();
            return status === 'closed won' || status === 'active account' || status === 'active account (closed won)';
        }
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">Active Accounts</DialogTitle>
                    <p className="text-sm text-muted-foreground">{activeAccounts.length} active account{activeAccounts.length !== 1 ? 's' : ''}</p>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6">
                    <div className="rounded-md border border-border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Company</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Contact</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Assigned VA</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Contract Signed</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Service Start</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {activeAccounts.length > 0 ? (
                                    activeAccounts.map((lead) => {
                                        // Handle edge case where frontend vs DB fields might differ slightly
                                        const vaName = (lead as any).assignedVA ?? (lead as any).assignedVa ?? lead.assignedAgent ?? '—';

                                        return (
                                            <tr key={lead.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium whitespace-nowrap">{lead.companyName || '—'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{lead.name || '—'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{vaName}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(lead.contractSignDate)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(lead.activeServiceDate)}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                            No active accounts found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
