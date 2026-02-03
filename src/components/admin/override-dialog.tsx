"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { overrideAllocation } from "@/lib/actions/allocation";
import { RefreshCw, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface OverrideDialogProps {
  bookingId: string;
  currentEngineerId: string | null;
  engineers: Array<{ id: string; name: string }>;
  onComplete: () => void;
}

export function OverrideDialog({
  bookingId,
  currentEngineerId,
  engineers,
  onComplete,
}: OverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableEngineers = engineers.filter((e) => e.id !== currentEngineerId);

  const handleSubmit = async () => {
    if (!selectedEngineerId || !reason.trim()) return;

    setSubmitting(true);
    try {
      const result = await overrideAllocation(bookingId, selectedEngineerId, reason.trim());
      if (result.success) {
        const engineerName = engineers.find((e) => e.id === selectedEngineerId)?.name;
        toast.success(`Reassigned to ${engineerName}`);
        setOpen(false);
        setSelectedEngineerId("");
        setReason("");
        onComplete();
      } else {
        toast.error(result.error || "Override failed");
      }
    } catch {
      toast.error("Failed to override allocation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reassign Engineer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Engineer</DialogTitle>
          <DialogDescription>
            Select a new engineer and provide a reason for the override.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              New Engineer
            </label>
            <Select value={selectedEngineerId} onValueChange={setSelectedEngineerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select engineer..." />
              </SelectTrigger>
              <SelectContent>
                {availableEngineers.map((eng) => (
                  <SelectItem key={eng.id} value={eng.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {eng.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Reason for override
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer specifically requested this engineer"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedEngineerId || !reason.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                "Confirm Reassignment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
