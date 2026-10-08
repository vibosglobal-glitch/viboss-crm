import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type MeetingBookedData = {
    date: string;
    time: string;
    ams: string;
    notes: string;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadName: string;
    onSubmit: (data: MeetingBookedData) => void;
}

export function MeetingBookedModal({ open, onOpenChange, leadName, onSubmit }: Props) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [ams, setAms] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (!date || !time) return;
        onSubmit({ date, time, ams, notes });
        setDate(new Date().toISOString().split('T')[0]);
        setTime('09:00');
        setAms('');
        setNotes('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Meeting Booked for {leadName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            Time
                        </Label>
                        <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ams" className="text-right">
                            Assigned To (AMS)
                        </Label>
                        <Input
                            id="ams"
                            placeholder="Account Manager / SDR"
                            value={ams}
                            onChange={(e) => setAms(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="notes" className="text-right mt-2">
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Agenda or specific details for the meeting..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!date || !time}>Save Meeting</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
