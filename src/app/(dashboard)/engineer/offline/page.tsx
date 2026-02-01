"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import { getCachedJobs, CachedJob, getPendingRequestCount } from "@/lib/offline";
import { format, parseISO, isToday } from "date-fns";

export default function OfflinePage() {
  const [jobs, setJobs] = useState<CachedJob[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCachedData();

    // Listen for when we come back online
    const handleOnline = () => {
      window.location.href = "/engineer";
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const loadCachedData = async () => {
    try {
      const [cachedJobs, pending] = await Promise.all([
        getCachedJobs(),
        getPendingRequestCount(),
      ]);

      // Filter to today's jobs
      const todayJobs = cachedJobs.filter((job) =>
        isToday(parseISO(job.scheduledDate))
      );

      setJobs(todayJobs);
      setPendingCount(pending);
    } catch (error) {
      console.error("Failed to load cached data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">You're Offline</h1>
            <p className="text-sm text-gray-500">Limited functionality available</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <WifiOff className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                You're currently offline. Some features may not be available.
              </p>
              <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>

            {pendingCount > 0 && (
              <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>{pendingCount} action{pendingCount > 1 ? "s" : ""}</strong> will sync when you're back online.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cached Today's Jobs */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Today's Jobs (Cached)
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading cached data...
            </div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>No cached jobs available</p>
                <p className="text-sm mt-1">
                  Jobs are cached when you're online
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{job.customerName}</p>
                        <p className="text-sm text-gray-500">{job.serviceName}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          job.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : job.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {job.slot === "AM" ? "Morning" : "Afternoon"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.postcode}
                      </span>
                    </div>

                    {job.address && (
                      <p className="text-sm text-gray-600 mt-2">{job.address}</p>
                    )}

                    {job.phone && (
                      <a
                        href={`tel:${job.phone}`}
                        className="inline-block mt-2 text-sm text-blue-600"
                      >
                        Call: {job.phone}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Offline Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">While Offline</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• View cached job details and addresses</li>
            <li>• Call customers directly</li>
            <li>• Actions will sync when back online</li>
          </ul>
        </div>
      </div>

      <BottomNav current="today" />
    </div>
  );
}
