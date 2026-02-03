"use client";

import { useState } from "react";
import { BookingStatus } from "@prisma/client";
import {
  Loader2,
  Navigation,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { useJobTracking } from "@/hooks/use-job-tracking";
import { TrackingIndicator } from "@/components/engineer/tracking-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  completeJob,
  declineJob,
  markRequiresRevisit,
} from "@/lib/actions/booking-status";

type JobStatusWorkflowProps = {
  bookingId: string;
  status: BookingStatus;
  hasSignature: boolean;
  siteLatitude?: number | null;
  siteLongitude?: number | null;
  onStatusChange?: (newStatus: BookingStatus) => void;
};

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
    description: "Job is scheduled and assigned to you",
  },
  EN_ROUTE: {
    label: "En Route",
    color: "bg-indigo-100 text-indigo-800",
    description: "Traveling to the job site",
  },
  ON_SITE: {
    label: "On Site",
    color: "bg-purple-100 text-purple-800",
    description: "Arrived at the job site",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-amber-100 text-amber-800",
    description: "Work is underway",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    description: "Job finished successfully",
  },
  PENDING: {
    label: "Pending",
    color: "bg-gray-100 text-gray-800",
    description: "Awaiting assignment",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800",
    description: "Job was cancelled",
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-800",
    description: "You declined this job",
  },
  REQUIRES_REVISIT: {
    label: "Requires Revisit",
    color: "bg-orange-100 text-orange-800",
    description: "Needs another visit to complete",
  },
};

export function JobStatusWorkflow({
  bookingId,
  status,
  hasSignature,
  siteLatitude,
  siteLongitude,
  onStatusChange,
}: JobStatusWorkflowProps) {
  const [loading, setLoading] = useState(false);
  const tracking = useJobTracking({
    bookingId,
    status,
    siteLatitude: siteLatitude ?? null,
    siteLongitude: siteLongitude ?? null,
    onStatusChange: (newStatus) => onStatusChange?.(newStatus as BookingStatus),
  });
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showRevisitDialog, setShowRevisitDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [revisitReason, setRevisitReason] = useState("");

  const config = STATUS_CONFIG[status];

  const handleAction = async (
    action: () => Promise<{ success: boolean; error?: string; newStatus?: BookingStatus }>
  ) => {
    setLoading(true);
    try {
      const result = await action();
      if (result.success && result.newStatus) {
        toast.success(`Status updated to ${STATUS_CONFIG[result.newStatus].label}`);
        onStatusChange?.(result.newStatus);
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }
    setLoading(true);
    try {
      const result = await declineJob(bookingId, declineReason.trim());
      if (result.success) {
        toast.success("Job declined");
        setShowDeclineDialog(false);
        onStatusChange?.("DECLINED");
      } else {
        toast.error(result.error || "Failed to decline job");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRevisit = async () => {
    if (!revisitReason.trim()) {
      toast.error("Please provide a reason for revisit");
      return;
    }
    setLoading(true);
    try {
      const result = await markRequiresRevisit(bookingId, revisitReason.trim());
      if (result.success) {
        toast.success("Marked as requiring revisit");
        setShowRevisitDialog(false);
        onStatusChange?.("REQUIRES_REVISIT");
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Terminal states - no actions available
  if (["COMPLETED", "CANCELLED", "DECLINED", "REQUIRES_REVISIT", "PENDING"].includes(status)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        <p className="text-sm text-gray-500">{config.description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Progress indicator */}
      <div className="relative">
        <div className="flex justify-between items-center">
          {["CONFIRMED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETED"].map((s, i) => {
            const isActive = s === status;
            const isPast = ["CONFIRMED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETED"]
              .indexOf(status) >= i;
            return (
              <div
                key={s}
                className={`flex flex-col items-center ${i !== 0 ? "flex-1" : ""}`}
              >
                {i !== 0 && (
                  <div
                    className={`absolute h-0.5 ${
                      isPast ? "bg-blue-500" : "bg-gray-200"
                    }`}
                    style={{
                      left: `${(i - 1) * 25 + 12.5}%`,
                      right: `${100 - i * 25 - 12.5}%`,
                      top: "0.75rem",
                    }}
                  />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : isPast
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isPast && !isActive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isActive ? "font-medium text-blue-600" : "text-gray-500"
                  }`}
                >
                  {STATUS_CONFIG[s as BookingStatus]?.label?.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons based on current status */}
      <div className="space-y-2 pt-4">
        {status === "CONFIRMED" && (
          <>
            <Button
              className="w-full"
              onClick={() => tracking.startTracking()}
              disabled={loading || tracking.isTracking}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Start Tracking
            </Button>
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeclineDialog(true)}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline Job
            </Button>
          </>
        )}

        {(status === "EN_ROUTE" || status === "ON_SITE") && (
          <TrackingIndicator
            trackingStatus={tracking.trackingStatus}
            currentDistance={tracking.currentDistance}
            hasSiteCoords={tracking.hasSiteCoords}
            isTracking={tracking.isTracking}
            bookingStatus={status}
            onManualArrive={tracking.manualArrive}
            onManualStartWork={tracking.manualStartWork}
            error={tracking.error}
            variant="sidebar"
          />
        )}

        {status === "IN_PROGRESS" && (
          <>
            <Button
              className="w-full"
              onClick={() => handleAction(() => completeJob(bookingId))}
              disabled={loading || !hasSignature}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Complete Job
            </Button>
            {!hasSignature && (
              <p className="text-sm text-amber-600 text-center">
                Customer signature required to complete
              </p>
            )}
            <Button
              variant="outline"
              className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={() => setShowRevisitDialog(true)}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Requires Revisit
            </Button>
          </>
        )}
      </div>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Job</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this job. The job will be
              returned to the pending queue for reassignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason</Label>
              <Textarea
                id="declineReason"
                placeholder="e.g., Unable to reach site on scheduled date"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={loading || !declineReason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisit Dialog */}
      <Dialog open={showRevisitDialog} onOpenChange={setShowRevisitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Requires Revisit</DialogTitle>
            <DialogDescription>
              Explain why another visit is needed to complete this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revisitReason">Reason</Label>
              <Textarea
                id="revisitReason"
                placeholder="e.g., Additional equipment needed, customer not available for signature"
                value={revisitReason}
                onChange={(e) => setRevisitReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRevisit}
              disabled={loading || !revisitReason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
