"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addWeeks, subWeeks, parseISO, isSameDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Settings,
  Calendar as CalendarIcon,
  ClipboardList,
} from "lucide-react";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import { Button } from "@/components/ui/button";
import { formatDate, getSlotTime } from "@/lib/utils";

interface CalendarJob {
  id: string;
  date: string;
  slot: string;
  status: string;
  customerName: string;
  serviceName: string;
  postcode: string;
  estimatedDuration: number;
}

interface WeekDay {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

interface AvailableJob {
  id: string;
  date: string;
  slot: string;
  serviceName: string;
  siteName: string;
  postcode: string;
}

interface CalendarClientProps {
  weekDays: WeekDay[];
  jobs: CalendarJob[];
  weekStartDate: string;
  availableJobs?: AvailableJob[];
}

export function CalendarClient({ weekDays, jobs, weekStartDate, availableJobs = [] }: CalendarClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "available">("schedule");

  const navigateWeek = (direction: "prev" | "next") => {
    const currentStart = parseISO(weekStartDate);
    const newStart = direction === "next"
      ? addWeeks(currentStart, 1)
      : subWeeks(currentStart, 1);
    router.push(`/engineer/calendar?week=${format(newStart, "yyyy-MM-dd")}`);
  };

  const getJobsForDate = (date: string) => {
    return jobs.filter((job) => isSameDay(parseISO(job.date), parseISO(date)));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "IN_PROGRESS":
      case "ON_SITE":
      case "EN_ROUTE":
        return "bg-blue-500";
      case "CONFIRMED":
        return "bg-amber-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Calendar</h1>
          <Link href="/engineer/profile/calendar">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Sync
            </Button>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "schedule"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "available"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Available ({availableJobs.length})
          </button>
        </div>
      </div>

      {activeTab === "schedule" ? (
      <>
      {/* Week Navigation */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek("prev")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">
            {format(parseISO(weekStartDate), "MMM d")} -{" "}
            {format(addWeeks(parseISO(weekStartDate), 1), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => navigateWeek("next")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week View */}
      <div className="bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`py-3 text-center transition-colors ${
                day.isToday
                  ? "bg-blue-50"
                  : selectedDate === day.date
                  ? "bg-gray-50"
                  : ""
              }`}
            >
              <div className="text-xs text-gray-500">{day.dayName}</div>
              <div
                className={`w-8 h-8 mx-auto mt-1 rounded-full flex items-center justify-center font-medium ${
                  day.isToday
                    ? "bg-blue-600 text-white"
                    : selectedDate === day.date
                    ? "bg-gray-200"
                    : ""
                }`}
              >
                {day.dayNumber}
              </div>
              {/* Job indicators */}
              <div className="flex justify-center gap-0.5 mt-1">
                {getJobsForDate(day.date)
                  .slice(0, 3)
                  .map((job) => (
                    <div
                      key={job.id}
                      className={`w-1.5 h-1.5 rounded-full ${getStatusColor(job.status)}`}
                    />
                  ))}
              </div>
            </button>
          ))}
        </div>

        {/* Time Slots */}
        <div className="divide-y">
          {["AM", "PM"].map((slot) => (
            <div key={slot} className="min-h-[120px]">
              <div className="flex">
                {/* Time Label */}
                <div className="w-16 py-3 px-2 text-xs text-gray-500 border-r flex-shrink-0">
                  {slot === "AM" ? "8:00" : "12:00"}
                </div>
                {/* Days */}
                <div className="flex-1 grid grid-cols-7">
                  {weekDays.map((day) => {
                    const dayJobs = getJobsForDate(day.date).filter(
                      (j) => j.slot === slot
                    );
                    return (
                      <div
                        key={`${day.date}-${slot}`}
                        className={`border-r last:border-r-0 p-1 min-h-[100px] ${
                          day.isToday ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {dayJobs.map((job) => (
                          <Link
                            key={job.id}
                            href={`/engineer/jobs/${job.id}`}
                            className={`block p-1.5 rounded text-xs mb-1 ${
                              job.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : job.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <div className="font-medium truncate">
                              {job.customerName}
                            </div>
                            <div className="truncate opacity-80">
                              {job.serviceName}
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Detail (Mobile) */}
      {selectedDate && (
        <div className="px-4 mt-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            {format(parseISO(selectedDate), "EEEE, MMMM d")}
          </h2>
          <div className="space-y-2">
            {getJobsForDate(selectedDate).length === 0 ? (
              <div className="bg-white rounded-lg border p-4 text-center text-gray-500">
                No jobs scheduled
              </div>
            ) : (
              getJobsForDate(selectedDate).map((job) => (
                <Link
                  key={job.id}
                  href={`/engineer/jobs/${job.id}`}
                  className="block bg-white rounded-lg border p-3 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{job.customerName}</div>
                      <div className="text-sm text-gray-500">{job.serviceName}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
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
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.slot === "AM" ? "Morning" : "Afternoon"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.postcode}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      </>
      ) : (
      /* Available Jobs Tab */
      <div className="px-4 mt-4">
        {availableJobs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No available jobs this week</p>
            <p className="text-sm mt-1">Check back later or browse other weeks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableJobs.map((job) => (
              <Link
                key={job.id}
                href={`/engineer/jobs/${job.id}`}
                className="block bg-white rounded-lg border p-4 active:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{job.serviceName}</div>
                    <div className="text-sm text-gray-500">{job.siteName}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    Available
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(parseISO(job.date), "EEE d MMM")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {job.slot === "AM" ? "Morning" : "Afternoon"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.postcode}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav current="calendar" />
    </div>
  );
}
