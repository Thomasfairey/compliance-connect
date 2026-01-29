"use client";

import { useState } from "react";
import Link from "next/link";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Clock, Zap, Shield, FileCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingWithRelations } from "@/types";

type JobsCalendarProps = {
  jobs: BookingWithRelations[];
};

const serviceIcons: Record<string, typeof Zap> = {
  "pat-testing": Zap,
  "fire-alarm-testing": Shield,
  "emergency-lighting": FileCheck,
  "fixed-wire-testing": Building2,
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

export function JobsCalendar({ jobs }: JobsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Auto-select today

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Group jobs by date
  const jobsByDate = new Map<string, BookingWithRelations[]>();
  jobs.forEach((job) => {
    const dateKey = format(new Date(job.scheduledDate), "yyyy-MM-dd");
    if (!jobsByDate.has(dateKey)) {
      jobsByDate.set(dateKey, []);
    }
    jobsByDate.get(dateKey)!.push(job);
  });

  // Get jobs for selected date
  const selectedDateJobs = selectedDate
    ? jobsByDate.get(format(selectedDate, "yyyy-MM-dd")) || []
    : [];

  const formatSlotTime = (slot: string) => {
    if (slot === "AM") return "Morning";
    if (slot === "PM") return "Afternoon";
    const hour = parseInt(slot.split(":")[0]);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border overflow-hidden bg-white">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
            <div
              key={dayName}
              className="py-3 text-center text-sm font-medium text-muted-foreground"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="divide-y">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x min-h-[100px]">
              {week.map((dayDate) => {
                const dateStr = format(dayDate, "yyyy-MM-dd");
                const dayJobs = jobsByDate.get(dateStr) || [];
                const isCurrentMonth = isSameMonth(dayDate, currentMonth);
                const isSelected = selectedDate && isSameDay(dayDate, selectedDate);
                const isTodayDate = isToday(dayDate);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dayDate)}
                    className={cn(
                      "p-2 text-left transition-colors hover:bg-muted/30 relative",
                      !isCurrentMonth && "bg-muted/20 text-muted-foreground/50",
                      isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                      isTodayDate && !isSelected && "bg-amber-50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isTodayDate && "text-primary font-bold"
                      )}
                    >
                      {format(dayDate, "d")}
                    </span>

                    {/* Job indicators */}
                    {dayJobs.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayJobs.slice(0, 3).map((job) => {
                          const Icon = serviceIcons[job.service.slug] || Zap;
                          return (
                            <div
                              key={job.id}
                              className={cn(
                                "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded truncate",
                                statusColors[job.status]
                              )}
                            >
                              <Icon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{formatSlotTime(job.slot)}</span>
                            </div>
                          );
                        })}
                        {dayJobs.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-1">
                            +{dayJobs.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span className="text-muted-foreground">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-muted-foreground">Completed</span>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border rounded-xl p-4 bg-white">
          <h4 className="font-semibold mb-4">
            {format(selectedDate, "EEEE, d MMMM yyyy")}
          </h4>

          {selectedDateJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No jobs scheduled for this day
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDateJobs.map((job) => {
                const Icon = serviceIcons[job.service.slug] || Zap;
                return (
                  <Link
                    key={job.id}
                    href={`/engineer/jobs/${job.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border hover:border-primary/50 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{job.service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.estimatedQty} {job.service.unitName}s
                            </p>
                          </div>
                        </div>
                        <Badge className={cn("text-xs", statusColors[job.status])}>
                          {job.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatSlotTime(job.slot)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{job.site.postcode}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Site: </span>
                          <span className="font-medium">{job.site.name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {job.site.address}
                        </p>
                      </div>

                      {job.notes && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-sm text-muted-foreground">
                          {job.notes}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
