"use client";

import Link from "next/link";
import { Check, ChevronRight, Clock, MapPin } from "lucide-react";

interface TodayJob {
  id: string;
  status: string;
  customerName: string;
  address: string;
  postcode: string;
  scheduledTime: string;
  services: string[];
}

interface JobTimelineProps {
  jobs: TodayJob[];
  currentJobId?: string;
  onJobTap?: (job: TodayJob) => void;
}

export function JobTimeline({ jobs, currentJobId, onJobTap }: JobTimelineProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
        <p>No jobs scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job, index) => {
        const isCurrent = job.id === currentJobId;
        const isCompleted = job.status === "COMPLETED";

        return (
          <div key={job.id} className="relative">
            {/* Connecting Line */}
            {index < jobs.length - 1 && (
              <div
                className={`absolute left-4 top-14 w-0.5 h-6 ${
                  isCompleted ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}

            {/* Job Card */}
            <Link
              href={`/engineer/jobs/${job.id}`}
              onClick={() => onJobTap?.(job)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isCurrent
                  ? "bg-blue-50 border-2 border-blue-300"
                  : isCompleted
                  ? "bg-gray-50 opacity-70"
                  : "bg-white border border-gray-200 hover:border-gray-300 active:bg-gray-50"
              }`}
            >
              {/* Status Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      isCompleted ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {job.customerName}
                  </span>
                  <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                    {job.scheduledTime}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{job.postcode}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {job.services.slice(0, 2).map((service) => (
                    <span key={service} className="text-xs text-gray-400">
                      {service}
                    </span>
                  ))}
                  {job.services.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{job.services.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
