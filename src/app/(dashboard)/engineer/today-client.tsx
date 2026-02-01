"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  WifiOff,
  CheckCircle,
  Clock,
  PoundSterling,
  Navigation,
  Bell,
} from "lucide-react";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import {
  CurrentJobCard,
  NextJobCard,
  NoJobsCard,
} from "@/components/engineer/mobile/current-job-card";
import { JobTimeline } from "@/components/engineer/mobile/job-timeline";
import { toast } from "sonner";

interface TodayJob {
  id: string;
  status: string;
  customerName: string;
  address: string;
  postcode: string;
  scheduledTime: string;
  slot: string;
  services: string[];
  contactName?: string;
  contactPhone?: string;
  accessNotes?: string;
  estimatedDuration: number;
  quotedPrice: number;
}

interface TodayViewClientProps {
  userName: string;
  jobs: TodayJob[];
  stats: {
    todayEarnings: number;
    totalJobs: number;
    completedJobs: number;
    totalHours: number;
  };
}

export function TodayViewClient({ userName, jobs: initialJobs, stats }: TodayViewClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [offline, setOffline] = useState(false);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh on focus
  useEffect(() => {
    const handleFocus = () => router.refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [router]);

  // Find current and next jobs
  const activeStatuses = ["CONFIRMED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"];
  const currentJob = jobs.find((j) => ["EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(j.status));
  const nextJob = !currentJob
    ? jobs.find((j) => j.status === "CONFIRMED")
    : null;

  // Calculate estimated finish time
  const calculateEstimatedFinish = () => {
    const remainingJobs = jobs.filter((j) => j.status !== "COMPLETED");
    if (remainingJobs.length === 0) return "Done!";
    const totalMinutes = remainingJobs.reduce((sum, j) => sum + j.estimatedDuration, 0);
    const now = new Date();
    const finishTime = new Date(now.getTime() + totalMinutes * 60000);
    return format(finishTime, "h:mm a");
  };

  // Handle job status updates
  const handleJobAction = async (action: string) => {
    const job = currentJob || nextJob;
    if (!job) return;

    try {
      const response = await fetch(`/api/engineer/jobs/${job.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updated = await response.json();
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: updated.status } : j))
      );

      toast.success(getSuccessMessage(action));
      router.refresh();
    } catch (error) {
      if (offline) {
        toast.info("Saved offline - will sync when connected");
      } else {
        throw error;
      }
    }
  };

  const getSuccessMessage = (action: string) => {
    switch (action) {
      case "START_TRAVEL":
        return "You're on the way!";
      case "ARRIVE":
        return "Marked as arrived";
      case "START_WORK":
        return "Job started";
      default:
        return "Status updated";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Offline Banner */}
      {offline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Offline - changes will sync when connected
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {format(new Date(), "EEEE, d MMM")}
            </h1>
            <p className="text-sm text-gray-500">
              {stats.totalJobs} job{stats.totalJobs !== 1 ? "s" : ""} • {stats.totalHours}h estimated
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Earnings Quick View */}
            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
              <PoundSterling className="w-4 h-4" />
              <span className="font-medium">{Math.round(stats.todayEarnings)}</span>
            </div>
            {/* Notification Bell */}
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Current/Next Job Hero */}
      {currentJob ? (
        <CurrentJobCard job={currentJob} onAction={handleJobAction} />
      ) : nextJob ? (
        <NextJobCard job={nextJob} onStart={() => handleJobAction("ACCEPT")} />
      ) : jobs.length === 0 ? (
        <NoJobsCard />
      ) : null}

      {/* Today's Timeline */}
      {jobs.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Today's Schedule</h2>
          <JobTimeline jobs={jobs} currentJobId={currentJob?.id} />
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <QuickStatCard
            label="Completed"
            value={`${stats.completedJobs}/${stats.totalJobs}`}
            icon={CheckCircle}
            color="green"
          />
          <QuickStatCard
            label="Est. Finish"
            value={calculateEstimatedFinish()}
            icon={Clock}
            color="purple"
          />
          <QuickStatCard
            label="Distance"
            value="~15km"
            icon={Navigation}
            color="blue"
          />
        </div>
      </div>

      {/* Greeting for empty state */}
      {jobs.length === 0 && (
        <div className="px-4 mt-8 text-center">
          <p className="text-gray-600">
            Good {getTimeOfDay()}, {userName}!
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Check back later for new job assignments.
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav current="today" />
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle;
  color: "green" | "blue" | "purple";
}) {
  const colorClasses = {
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl border p-3">
      <div className={`w-8 h-8 ${colorClasses[color]} rounded-lg flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
