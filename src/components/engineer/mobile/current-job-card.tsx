"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  MapPin,
  Phone,
  AlertCircle,
  Wrench,
  CheckCircle,
  ExternalLink,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useJobTracking } from "@/hooks/use-job-tracking";
import { TrackingIndicator } from "@/components/engineer/tracking-indicator";

interface TodayJob {
  id: string;
  status: string;
  customerName: string;
  address: string;
  postcode: string;
  scheduledTime: string;
  services: string[];
  contactName?: string;
  contactPhone?: string;
  accessNotes?: string;
  siteLatitude?: number | null;
  siteLongitude?: number | null;
}

interface CurrentJobCardProps {
  job: TodayJob;
  onAction: (action: string) => Promise<void>;
  onStatusChange?: (newStatus: string) => void;
}

const statusConfig: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  primaryAction: { label: string; action: string; icon: typeof Navigation };
  showNavigation?: boolean;
}> = {
  CONFIRMED: {
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "Ready to Go",
    primaryAction: { label: "Start Driving", action: "START_TRAVEL", icon: Navigation },
  },
  EN_ROUTE: {
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "On the Way",
    primaryAction: { label: "I've Arrived", action: "ARRIVE", icon: MapPin },
    showNavigation: true,
  },
  ON_SITE: {
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "On Site",
    primaryAction: { label: "Start Job", action: "START_WORK", icon: Wrench },
  },
  IN_PROGRESS: {
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "In Progress",
    primaryAction: { label: "Complete Job", action: "COMPLETE", icon: CheckCircle },
  },
};

function getNavigationUrl(address: string, postcode: string): string {
  const destination = encodeURIComponent(`${address}, ${postcode}`);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `maps://maps.apple.com/?daddr=${destination}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function CurrentJobCard({ job, onAction, onStatusChange }: CurrentJobCardProps) {
  const [loading, setLoading] = useState(false);
  const config = statusConfig[job.status];
  const tracking = useJobTracking({
    bookingId: job.id,
    status: job.status,
    siteLatitude: job.siteLatitude ?? null,
    siteLongitude: job.siteLongitude ?? null,
    onStatusChange: (newStatus) => onStatusChange?.(newStatus),
  });

  if (!config) return null;

  const handleAction = async () => {
    setLoading(true);
    try {
      await onAction(config.primaryAction.action);
    } catch (error) {
      toast.error("Failed to update job status");
    } finally {
      setLoading(false);
    }
  };

  const ActionIcon = config.primaryAction.icon;

  return (
    <div className="mx-4 mt-4">
      <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4`}>
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-medium ${config.color} bg-white/50 px-2 py-1 rounded`}>
            {config.label}
          </span>
          <span className="text-sm text-gray-500">{job.scheduledTime}</span>
        </div>

        {/* Customer & Location */}
        <Link href={`/engineer/jobs/${job.id}`}>
          <h3 className="font-semibold text-lg">{job.customerName}</h3>
          <p className="text-gray-600 mt-1">{job.address}</p>
          <p className="text-gray-500 text-sm">{job.postcode}</p>
        </Link>

        {/* Services */}
        <div className="flex flex-wrap gap-2 mt-3">
          {job.services.map((service) => (
            <span key={service} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
              {service}
            </span>
          ))}
        </div>

        {/* Contact & Notes */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-2">
          {job.contactName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{job.contactName}</span>
              {job.contactPhone && (
                <a
                  href={`tel:${job.contactPhone}`}
                  className="flex items-center gap-1 text-blue-600"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Call</span>
                </a>
              )}
            </div>
          )}
          {job.accessNotes && (
            <p className="text-sm text-amber-700 bg-amber-100/50 p-2 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{job.accessNotes}</span>
            </p>
          )}
        </div>

        {/* Tracking indicator (EN_ROUTE / ON_SITE) */}
        {(job.status === "EN_ROUTE" || job.status === "ON_SITE") && (
          <div className="mt-3">
            <TrackingIndicator
              trackingStatus={tracking.trackingStatus}
              currentDistance={tracking.currentDistance}
              hasSiteCoords={tracking.hasSiteCoords}
              isTracking={tracking.isTracking}
              bookingStatus={job.status}
              onManualArrive={tracking.manualArrive}
              onManualStartWork={tracking.manualStartWork}
              error={tracking.error}
              variant="card"
            />
          </div>
        )}

        {/* Open in Maps (when EN_ROUTE) */}
        {job.status === "EN_ROUTE" && (
          <a
            href={getNavigationUrl(job.address, job.postcode)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Maps
          </a>
        )}

        {/* Start Tracking (CONFIRMED) */}
        {job.status === "CONFIRMED" && (
          <button
            onClick={() => tracking.startTracking()}
            disabled={tracking.isTracking}
            className="mt-3 w-full bg-blue-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {tracking.isTracking ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Navigation className="w-6 h-6" />
                Start Tracking
              </>
            )}
          </button>
        )}

        {/* Complete Job (IN_PROGRESS) */}
        {job.status === "IN_PROGRESS" && (
          <Link
            href={`/engineer/jobs/${job.id}`}
            className="mt-3 w-full bg-green-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform"
          >
            <CheckCircle className="w-6 h-6" />
            {config.primaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function NextJobCard({ job, onStatusChange }: { job: TodayJob; onStatusChange?: (newStatus: string) => void }) {
  const tracking = useJobTracking({
    bookingId: job.id,
    status: job.status,
    siteLatitude: job.siteLatitude ?? null,
    siteLongitude: job.siteLongitude ?? null,
    onStatusChange: (newStatus) => onStatusChange?.(newStatus),
  });

  return (
    <div className="mx-4 mt-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Next Up</span>
          <span className="text-sm text-gray-500">{job.scheduledTime}</span>
        </div>

        <Link href={`/engineer/jobs/${job.id}`}>
          <h3 className="font-semibold text-lg">{job.customerName}</h3>
          <p className="text-gray-600 mt-1">{job.address}, {job.postcode}</p>
        </Link>

        <div className="flex flex-wrap gap-2 mt-3">
          {job.services.map((service) => (
            <span key={service} className="text-xs bg-white px-2 py-1 rounded border">
              {service}
            </span>
          ))}
        </div>

        <button
          onClick={() => tracking.startTracking()}
          disabled={tracking.isTracking}
          className="mt-4 w-full bg-blue-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
        >
          {tracking.isTracking ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Navigation className="w-6 h-6" />
              Start Tracking
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function NoJobsCard() {
  return (
    <div className="mx-4 mt-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg text-green-800">All Done for Today!</h3>
        <p className="text-green-600 mt-1">You have no more jobs scheduled.</p>
      </div>
    </div>
  );
}
