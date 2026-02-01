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
}

interface CurrentJobCardProps {
  job: TodayJob;
  onAction: (action: string) => Promise<void>;
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

export function CurrentJobCard({ job, onAction }: CurrentJobCardProps) {
  const [loading, setLoading] = useState(false);
  const config = statusConfig[job.status];

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

        {/* Navigation Button (when EN_ROUTE) */}
        {config.showNavigation && (
          <a
            href={getNavigationUrl(job.address, job.postcode)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Maps
          </a>
        )}

        {/* Primary Action Button */}
        {job.status === "IN_PROGRESS" ? (
          <Link
            href={`/engineer/jobs/${job.id}`}
            className="mt-3 w-full bg-green-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform"
          >
            <ActionIcon className="w-6 h-6" />
            {config.primaryAction.label}
          </Link>
        ) : (
          <button
            onClick={handleAction}
            disabled={loading}
            className={`mt-3 w-full ${
              job.status === "IN_PROGRESS" ? "bg-green-600" : "bg-blue-600"
            } text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-70`}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ActionIcon className="w-6 h-6" />
                {config.primaryAction.label}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function NextJobCard({ job, onStart }: { job: TodayJob; onStart: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

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
          onClick={handleStart}
          disabled={loading}
          className="mt-4 w-full bg-blue-600 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Play className="w-6 h-6" />
              Start This Job
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
