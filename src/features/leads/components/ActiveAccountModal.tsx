import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ActiveAccountData = {
  contractSignDate: string;
  activeServiceDate: string;
  assignedVA: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onSubmit: (data: ActiveAccountData) => void;
}

export function ActiveAccountModal({
  open,
  onOpenChange,
  leadName,
  onSubmit,
}: Props) {
  const [contractSignDate, setContractSignDate] = useState("");
  const [activeServiceDate, setActiveServiceDate] = useState("");
  const [assignedVA, setAssignedVA] = useState("");

  const handleSubmit = () => {
    onSubmit({ contractSignDate, activeServiceDate, assignedVA });
    setContractSignDate("");
    setActiveServiceDate("");
    setAssignedVA("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Active Account Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Please provide active account details for{" "}
            <strong>{leadName}</strong>.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="contractSignDate">Contract Signed Date</Label>
            <Input
              id="contractSignDate"
              type="date"
              value={contractSignDate}
              onChange={(e) => setContractSignDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="activeServiceDate">Service Started Date</Label>
            <Input
              id="activeServiceDate"
              type="date"
              value={activeServiceDate}
              onChange={(e) => setActiveServiceDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignedVA">Assigned VA</Label>
            <Input
              id="assignedVA"
              placeholder="VA Name"
              value={assignedVA}
              onChange={(e) => setAssignedVA(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
