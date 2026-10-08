'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays } from 'lucide-react';

interface CallNotesModalProps {
  open: boolean;
  leadName: string;
  /** If true, shows the optional follow-up date picker inside this modal */
  showFollowUp?: boolean;
  onSave: (notes: string, duration: number, followUpDate?: string) => Promise<void>;
  onClose: () => void;
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function CallNotesModal({
  open,
  leadName,
  showFollowUp = true,
  onSave,
  onClose,
}: CallNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        notes,
        typeof duration === 'number' ? duration : 0,
        followUpDate || undefined,
      );
      setNotes('');
      setDuration('');
      setFollowUpDate('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    setDuration('');
    setFollowUpDate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Call Notes</DialogTitle>
          <DialogDescription>
            Add notes for your call with <span className="font-semibold text-foreground">{leadName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was discussed, objections, next steps…"
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Duration (min):</label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 5"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {showFollowUp && (
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Schedule follow-up <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={followUpDate === getTomorrow() ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => setFollowUpDate(getTomorrow())}
                >
                  Tomorrow
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setFollowUpDate(d.toISOString().split('T')[0]);
                  }}
                >
                  In 3 days
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setFollowUpDate(d.toISOString().split('T')[0]);
                  }}
                >
                  Next week
                </Button>
                {followUpDate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setFollowUpDate('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <input
                type="date"
                min={getToday()}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              {followUpDate && (
                <p className="text-xs text-primary font-medium">
                  Follow-up will be scheduled for {new Date(followUpDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Skip
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : followUpDate ? 'Save & Schedule Follow-up' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
