"use client";

import { useState } from "react";
import { MapPin, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrackingStatus } from "@/hooks/use-job-tracking";

interface TrackingIndicatorProps {
  trackingStatus: TrackingStatus;
  currentDistance: number | null;
  hasSiteCoords: boolean;
  isTracking: boolean;
  bookingStatus: string;
  onManualArrive: () => Promise<void>;
  onManualStartWork: () => Promise<void>;
  error: string | null;
  variant: "card" | "sidebar";
}

const statusConfig: Record<
  TrackingStatus,
  { color: string; pulseColor: string; label: string }
> = {
  idle: { color: "bg-gray-400", pulseColor: "bg-gray-300", label: "Ready" },
  traveling: {
    color: "bg-blue-500",
    pulseColor: "bg-blue-400",
    label: "Traveling to site...",
  },
  approaching: {
    color: "bg-amber-500",
    pulseColor: "bg-amber-400",
    label: "Approaching site",
  },
  arrived: {
    color: "bg-green-500",
    pulseColor: "bg-green-400",
    label: "Arrived — detecting activity...",
  },
  working: {
    color: "bg-green-600",
    pulseColor: "bg-green-500",
    label: "Work started",
  },
};

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km away`;
  }
  return `${meters}m away`;
}

export function TrackingIndicator({
  trackingStatus,
  currentDistance,
  hasSiteCoords,
  isTracking,
  bookingStatus,
  onManualArrive,
  onManualStartWork,
  error,
  variant,
}: TrackingIndicatorProps) {
  const [manualLoading, setManualLoading] = useState(false);
  const config = statusConfig[trackingStatus];
  const isCompact = variant === "card";

  const handleManualArrive = async () => {
    setManualLoading(true);
    try {
      await onManualArrive();
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualStartWork = async () => {
    setManualLoading(true);
    try {
      await onManualStartWork();
    } finally {
      setManualLoading(false);
    }
  };

  if (error) {
    return (
      <div className={`space-y-3 ${isCompact ? "" : "pt-2"}`}>
        <p className="text-sm text-amber-600">{error}</p>
        {bookingStatus === "EN_ROUTE" && (
          <Button
            className="w-full"
            onClick={handleManualArrive}
            disabled={manualLoading}
          >
            {manualLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            I&apos;ve Arrived
          </Button>
        )}
        {bookingStatus === "ON_SITE" && (
          <Button
            className="w-full"
            onClick={handleManualStartWork}
            disabled={manualLoading}
          >
            {manualLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Work
          </Button>
        )}
      </div>
    );
  }

  if (!isTracking && trackingStatus === "idle") return null;

  return (
    <div className={`space-y-3 ${isCompact ? "" : "pt-2"}`}>
      {/* Tracking status row */}
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-3 h-3 rounded-full ${config.color} z-10 relative`}
          />
          {trackingStatus !== "working" && trackingStatus !== "idle" && (
            <div
              className={`absolute w-6 h-6 rounded-full ${config.pulseColor} opacity-50 animate-ping`}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{config.label}</p>
          {currentDistance !== null &&
            hasSiteCoords &&
            trackingStatus !== "working" && (
              <p className="text-xs text-gray-500">
                {formatDistance(currentDistance)}
              </p>
            )}
        </div>
      </div>

      {/* Manual fallback buttons when no site coordinates */}
      {!hasSiteCoords && isTracking && (
        <div className="space-y-2">
          {bookingStatus === "EN_ROUTE" && (
            <Button
              className="w-full"
              onClick={handleManualArrive}
              disabled={manualLoading}
            >
              {manualLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              I&apos;ve Arrived
            </Button>
          )}
          {bookingStatus === "ON_SITE" && (
            <Button
              className="w-full"
              onClick={handleManualStartWork}
              disabled={manualLoading}
            >
              {manualLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Work
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
