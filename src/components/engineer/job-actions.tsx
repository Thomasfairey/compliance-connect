"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlayCircle, CheckCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { assignJobToSelf, startJob, completeJob } from "@/lib/actions";
import type { BookingStatus } from "@prisma/client";

interface JobActionsProps {
  bookingId: string;
  status: BookingStatus;
  canAssign: boolean;
  canStart: boolean;
  canComplete: boolean;
  isAssignedToMe: boolean;
}

export function JobActions({
  bookingId,
  status,
  canAssign,
  canStart,
  canComplete,
  isAssignedToMe,
}: JobActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [engineerNotes, setEngineerNotes] = useState("");

  async function handleAssign() {
    setLoading(true);
    try {
      const result = await assignJobToSelf(bookingId);
      if (result.success) {
        toast.success("Job assigned to you!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to assign job");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setLoading(true);
    try {
      const result = await startJob(bookingId);
      if (result.success) {
        toast.success("Job started!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to start job");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      const result = await completeJob(bookingId, {
        engineerNotes: engineerNotes || undefined,
      });
      if (result.success) {
        toast.success("Job completed successfully!");
        setCompleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to complete job");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canAssign && (
        <Button onClick={handleAssign} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Take Job
        </Button>
      )}

      {canStart && (
        <Button onClick={handleStart} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4 mr-2" />
          )}
          Start Job
        </Button>
      )}

      {canComplete && (
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
              <DialogDescription>
                Add any final notes before marking this job as complete.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Engineer Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any observations, issues, or recommendations..."
                  value={engineerNotes}
                  onChange={(e) => setEngineerNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCompleteDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isAssignedToMe && status === "IN_PROGRESS" && !canComplete && (
        <p className="text-sm text-amber-600 flex items-center">
          Add at least one test result to complete the job
        </p>
      )}
    </div>
  );
}
