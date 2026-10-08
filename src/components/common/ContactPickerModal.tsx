'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneCall, X, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lead } from '@/features/leads/types/leads';

interface ContactEntry {
    name: string;
    label: string;
    phone: string;
}

function toTelUri(phone: string): string {
    return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

/** Aggregate all phone numbers from a lead (own phones + employee phones) */
function getContacts(lead: Lead): ContactEntry[] {
    const contacts: ContactEntry[] = [];

    // Lead's own phone numbers
    const leadPhones: { label: string; value?: string }[] = [
        { label: 'Primary', value: lead.phone },
        { label: 'Work Direct', value: lead.workDirectPhone },
        { label: 'Mobile', value: lead.mobilePhone },
        { label: 'Home', value: lead.homePhone },
        { label: 'Corporate', value: lead.corporatePhone },
        { label: 'Company', value: lead.companyPhone },
        { label: 'Other', value: lead.otherPhone },
    ];

    for (const p of leadPhones) {
        if (p.value?.trim()) {
            contacts.push({ name: lead.name || 'Lead', label: p.label, phone: p.value.trim() });
        }
    }

    // Employee phone numbers
    if (lead.employees?.length) {
        for (const emp of lead.employees) {
            if (emp.leftOrganization) continue;
            if (emp.phones?.length) {
                for (const ep of emp.phones) {
                    if (ep.number?.trim()) {
                        contacts.push({
                            name: emp.name || 'Employee',
                            label: ep.type || 'Phone',
                            phone: ep.number.trim(),
                        });
                    }
                }
            }
        }
    }

    // Deduplicate by phone number
    const seen = new Set<string>();
    return contacts.filter((c) => {
        const normalized = c.phone.replace(/[^+\d]/g, '');
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}

interface ContactPickerModalProps {
    lead: Lead;
    open: boolean;
    onClose: () => void;
    onCall?: (phone: string) => void;
}

export function ContactPickerModal({ lead, open, onClose, onCall }: ContactPickerModalProps) {
    if (!open) return null;

    const contacts = getContacts(lead);

    const handleDial = (phone: string) => {
        if (onCall) {
            onCall(phone);
        }
        window.location.href = toTelUri(phone);
        onClose();
    };

    // If only one contact, skip modal and dial directly
    useEffect(() => {
        if (open && contacts.length === 1) {
            handleDial(contacts[0].phone);
        }
    }, [open, contacts.length]);

    if (contacts.length === 1 || contacts.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Select Contact</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {lead.companyName || lead.name} · {contacts.length} number{contacts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Contact list */}
                <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                    {contacts.map((contact, idx) => (
                        <button
                            key={`${contact.phone}-${idx}`}
                            onClick={() => handleDial(contact.phone)}
                            className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-primary/[0.04] transition-colors group"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{contact.label}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-medium text-foreground">{contact.phone}</span>
                                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <PhoneCall className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export { getContacts };
