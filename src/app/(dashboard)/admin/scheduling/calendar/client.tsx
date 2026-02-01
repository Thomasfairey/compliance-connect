"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Booking, Service, Site, User as UserType } from "@prisma/client";

interface BookingWithRelations extends Booking {
  service: Service;
  site: Site;
  customer: UserType;
  engineer: UserType | null;
}

interface EngineerWithProfile extends UserType {
  engineerProfile: { id: string } | null;
}

interface CalendarClientProps {
  bookings: BookingWithRelations[];
  engineers: EngineerWithProfile[];
  initialDate: string;
}

const timeSlots = [
  { id: "AM", label: "Morning", time: "08:00 - 12:00" },
  { id: "PM", label: "Afternoon", time: "12:00 - 17:00" },
];

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

export function CalendarClient({
  bookings,
  engineers,
  initialDate,
}: CalendarClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [selectedEngineer, setSelectedEngineer] = useState<string>("all");
  const [view, setView] = useState<"week" | "day">("week");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (selectedEngineer !== "all" && booking.engineerId !== selectedEngineer) {
        return false;
      }
      return true;
    });
  }, [bookings, selectedEngineer]);

  const getBookingsForDayAndSlot = (date: Date, slot: string) => {
    return filteredBookings.filter((booking) => {
      if (!booking.scheduledDate) return false;
      return (
        isSameDay(new Date(booking.scheduledDate), date) &&
        booking.slot === slot
      );
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(newDate);
    router.push(`/admin/scheduling/calendar?date=${newDate.toISOString().split("T")[0]}`);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    router.push("/admin/scheduling/calendar?date=today");
  };

  const stats = {
    total: filteredBookings.length,
    pending: filteredBookings.filter((b) => b.status === "PENDING").length,
    confirmed: filteredBookings.filter((b) => b.status === "CONFIRMED").length,
    completed: filteredBookings.filter((b) => b.status === "COMPLETED").length,
  };

  return (
    <AdminPage
      title="Master Calendar"
      description={`Week of ${format(weekStart, "MMM d, yyyy")}`}
      actions={
        <div className="flex items-center gap-3">
          <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Engineers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engineers</SelectItem>
              {engineers.map((eng) => (
                <SelectItem key={eng.id} value={eng.id}>
                  {eng.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-500">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, "MMMM yyyy")}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-3 bg-gray-50 border-r" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-center border-r last:border-r-0",
                isToday(day) && "bg-blue-50"
              )}
            >
              <div className="text-sm text-gray-500">{format(day, "EEE")}</div>
              <div
                className={cn(
                  "text-lg font-semibold mt-1",
                  isToday(day) && "text-blue-600"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => (
          <div key={slot.id} className="grid grid-cols-8 border-b last:border-b-0">
            <div className="p-3 bg-gray-50 border-r">
              <div className="font-medium text-sm">{slot.label}</div>
              <div className="text-xs text-gray-500">{slot.time}</div>
            </div>
            {weekDays.map((day) => {
              const dayBookings = getBookingsForDayAndSlot(day, slot.id);
              return (
                <div
                  key={`${day.toISOString()}-${slot.id}`}
                  className={cn(
                    "p-2 border-r last:border-r-0 min-h-[120px]",
                    isToday(day) && "bg-blue-50/30"
                  )}
                >
                  <div className="space-y-1">
                    {dayBookings.map((booking) => (
                      <Link
                        key={booking.id}
                        href={`/admin/bookings/${booking.id}`}
                        className="block"
                      >
                        <div
                          className={cn(
                            "p-2 rounded text-xs border",
                            statusColors[booking.status]
                          )}
                        >
                          <div className="font-medium truncate">
                            {booking.service.name}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{booking.site.postcode}</span>
                          </div>
                          {booking.engineer && (
                            <div className="flex items-center gap-1 text-gray-600 mt-0.5">
                              <User className="w-3 h-3" />
                              <span className="truncate">{booking.engineer.name}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                    {dayBookings.length === 0 && (
                      <div className="h-full flex items-center justify-center text-gray-300 text-xs">
                        No bookings
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-sm">
        <span className="text-gray-500">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", color.split(" ")[0])} />
            <span className="capitalize">{status.toLowerCase().replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
