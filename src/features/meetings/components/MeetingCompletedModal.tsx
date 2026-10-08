import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadName: string;
    onSubmit: (driveLink: string) => void;
}

export function MeetingCompletedModal({ open, onOpenChange, leadName, onSubmit }: Props) {
    const [driveLink, setDriveLink] = useState('');

    const handleSubmit = () => {
        onSubmit(driveLink);
        setDriveLink('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Meeting Completed: {leadName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        The meeting is complete! Please provide the recording (e.g. Google Drive Link) below so the team can review it.
                    </p>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="driveLink" className="text-right">
                            Drive Link
                        </Label>
                        <Input
                            id="driveLink"
                            placeholder="https://drive.google.com/..."
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel/Skip</Button>
                    <Button onClick={handleSubmit}>Save Link</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
