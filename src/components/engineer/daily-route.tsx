"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOptimizedRoute } from "@/lib/actions/allocation";
import {
  MapPin,
  Navigation,
  Clock,
  ChevronRight,
  Loader2,
  Route,
} from "lucide-react";
import Link from "next/link";
import { getSlotTime } from "@/lib/utils";

type DailyRouteProps = {
  engineerId: string;
  date: Date;
};

type RouteJob = {
  id: string;
  serviceName: string;
  siteName: string;
  postcode: string;
  slot: string;
  suggestedOrder: number;
};

export function DailyRoute({ engineerId, date }: DailyRouteProps) {
  const [jobs, setJobs] = useState<RouteJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoute() {
      setIsLoading(true);
      const result = await getOptimizedRoute(engineerId, date);
      if (result.success && result.bookings) {
        setJobs(result.bookings);
      }
      setIsLoading(false);
    }
    loadRoute();
  }, [engineerId, date]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Route className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No jobs scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  // Create Google Maps route URL
  const routeUrl = generateGoogleMapsRoute(jobs.map((j) => j.postcode));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="h-5 w-5" />
          Today&apos;s Route
        </CardTitle>
        <a href={routeUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <Navigation className="h-4 w-4 mr-1" />
            Open in Maps
          </Button>
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((job, index) => (
          <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              {/* Order number */}
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                {job.suggestedOrder}
              </div>

              {/* Job details */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {job.serviceName}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{job.siteName}</span>
                  <Badge variant="outline" className="text-xs">
                    {job.postcode}
                  </Badge>
                </div>
              </div>

              {/* Time slot */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{getSlotTime(job.slot)}</span>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        ))}

        {/* Route summary */}
        <div className="pt-3 border-t text-sm text-gray-500 text-center">
          {jobs.length} job{jobs.length > 1 ? "s" : ""} • Route optimized by
          postcode
        </div>
      </CardContent>
    </Card>
  );
}

function generateGoogleMapsRoute(postcodes: string[]): string {
  if (postcodes.length === 0) return "https://www.google.com/maps";

  const origin = encodeURIComponent(postcodes[0]);
  const destination = encodeURIComponent(postcodes[postcodes.length - 1]);
  const waypoints =
    postcodes.length > 2
      ? postcodes
          .slice(1, -1)
          .map((p) => encodeURIComponent(p))
          .join("|")
      : "";

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  return url;
}
