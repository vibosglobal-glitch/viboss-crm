'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateLead } from '@/hooks/useApi';
import { toast } from 'sonner';

const SOURCE_OPTIONS = ['manual', 'website', 'referral', 'linkedin', 'other'] as const;

interface AddLeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  notes: string;
}

const initialForm: AddLeadFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  source: 'manual',
  notes: '',
};

export function AddLeadDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddLeadFormData>(initialForm);
  const createLead = useCreateLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First Name and Last Name are required');
      return;
    }

    try {
      await createLead.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        source: form.source,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Lead created successfully');
      setForm(initialForm);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create lead');
    }
  };

  const set = (key: keyof AddLeadFormData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(initialForm); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              maxLength={254}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
            <input
              type="text"
              maxLength={100}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
            <input
              type="text"
              maxLength={100}
              value={form.company}
              onChange={e => set('company', e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Source</label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
            <textarea
              maxLength={10000}
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending} className="gradient-primary border-0">
              {createLead.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
