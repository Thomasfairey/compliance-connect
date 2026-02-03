"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Filter,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AllocationExplanation } from "@/components/admin/allocation-explanation";
import { OverrideDialog } from "@/components/admin/override-dialog";
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
  unallocatedCount?: number;
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

function getBookingStyle(booking: BookingWithRelations): string {
  if (!booking.engineerId) {
    return "bg-red-50 text-red-800 border-red-300 border-dashed";
  }
  return statusColors[booking.status] ?? statusColors.PENDING;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function CalendarClient({
  bookings,
  engineers,
  initialDate,
  unallocatedCount = 0,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialFilter = searchParams.get("filter") === "unallocated" ? "unallocated" : "all";
  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [selectedEngineer, setSelectedEngineer] = useState<string>(initialFilter);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [allocating, setAllocating] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (selectedEngineer === "unallocated") return !booking.engineerId;
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

  const handleAllocate = async (bookingId: string) => {
    setAllocating(true);
    try {
      const response = await fetch("/api/admin/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Allocated to ${data.engineerName}`);
        setSelectedBooking(null);
        startTransition(() => router.refresh());
      } else {
        toast.error(data.error || "Allocation failed");
      }
    } catch {
      toast.error("Failed to allocate booking");
    } finally {
      setAllocating(false);
    }
  };

  const stats = {
    total: filteredBookings.length,
    unallocated: filteredBookings.filter((b) => !b.engineerId).length,
    confirmed: filteredBookings.filter((b) => b.status === "CONFIRMED").length,
    completed: filteredBookings.filter((b) => b.status === "COMPLETED").length,
  };

  return (
    <AdminPage
      title="Calendar"
      description={`Week of ${format(weekStart, "MMM d, yyyy")}`}
      actions={
        <div className="flex items-center gap-3">
          <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Engineers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="unallocated">Unallocated Only</SelectItem>
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
        <Card className={stats.unallocated > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              {stats.unallocated > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
              <div className={cn("text-2xl font-bold", stats.unallocated > 0 ? "text-red-600" : "text-gray-400")}>
                {stats.unallocated}
              </div>
            </div>
            <div className="text-sm text-gray-500">Unallocated</div>
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

      {/* Global unallocated banner */}
      {unallocatedCount > 0 && selectedEngineer !== "unallocated" && (
        <button
          onClick={() => setSelectedEngineer("unallocated")}
          className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2 hover:bg-red-100 transition-colors text-left"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{unallocatedCount}</strong> booking{unallocatedCount !== 1 ? "s" : ""} awaiting allocation across all weeks.
          </span>
        </button>
      )}

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
                      <button
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="block w-full text-left"
                      >
                        <div
                          className={cn(
                            "p-2 rounded text-xs border transition-shadow hover:shadow-md",
                            getBookingStyle(booking)
                          )}
                        >
                          <div className="font-medium truncate">
                            {booking.service.name}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{booking.site.postcode}</span>
                          </div>
                          {booking.engineer ? (
                            <div className="flex items-center gap-1 text-gray-600 mt-0.5">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{booking.engineer.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 mt-0.5 font-medium">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>Unassigned</span>
                            </div>
                          )}
                        </div>
                      </button>
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
      <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
        <span className="text-gray-500">Status:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-dashed border-red-300 bg-red-50" />
          <span>Unallocated</span>
        </div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", color.split(" ")[0])} />
            <span className="capitalize">{status.toLowerCase().replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {/* Booking Side Panel */}
      <Sheet open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-md">
          {selectedBooking && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedBooking.service.name}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      !selectedBooking.engineerId
                        ? "bg-red-50 text-red-700 border-red-200"
                        : selectedBooking.status === "CONFIRMED"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {!selectedBooking.engineerId ? "Unallocated" : selectedBooking.status}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Customer */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</div>
                  <div className="mt-1 font-medium">{selectedBooking.customer.name}</div>
                  <div className="text-sm text-gray-500">{selectedBooking.customer.email}</div>
                </div>

                {/* Site */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Site</div>
                  <div className="mt-1 font-medium">{selectedBooking.site.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBooking.site.postcode}
                  </div>
                </div>

                {/* Date & Slot */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</div>
                    <div className="mt-1 font-medium">
                      {selectedBooking.scheduledDate
                        ? format(new Date(selectedBooking.scheduledDate), "EEE, MMM d yyyy")
                        : "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Slot</div>
                    <div className="mt-1 font-medium">{selectedBooking.slot}</div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</div>
                  <div className="mt-1 font-medium">{formatCurrency(selectedBooking.quotedPrice)}</div>
                </div>

                {/* Engineer */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Engineer</div>
                  {selectedBooking.engineer ? (
                    <div className="mt-1 font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {selectedBooking.engineer.name}
                    </div>
                  ) : (
                    <div className="mt-1 text-red-600 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      No engineer assigned
                    </div>
                  )}
                </div>

                {/* Reference */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reference</div>
                  <div className="mt-1 font-mono text-sm">{selectedBooking.reference}</div>
                </div>

                {/* Allocation Explanation (allocated bookings) */}
                {selectedBooking.engineerId && (
                  <AllocationExplanation bookingId={selectedBooking.id} />
                )}

                {/* Actions */}
                <div className="pt-4 border-t space-y-2">
                  {!selectedBooking.engineerId && (
                    <Button
                      className="w-full"
                      onClick={() => handleAllocate(selectedBooking.id)}
                      disabled={allocating}
                    >
                      {allocating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Allocating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Auto-Allocate
                        </>
                      )}
                    </Button>
                  )}

                  {selectedBooking.engineerId && (
                    <OverrideDialog
                      bookingId={selectedBooking.id}
                      currentEngineerId={selectedBooking.engineerId}
                      engineers={engineers.map((e) => ({ id: e.id, name: e.name ?? "Unknown" }))}
                      onComplete={() => {
                        setSelectedBooking(null);
                        startTransition(() => router.refresh());
                      }}
                    />
                  )}

                  <Link href={`/admin/bookings/${selectedBooking.id}`} className="block">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Details
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}
