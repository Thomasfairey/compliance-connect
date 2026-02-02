"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Check,
  X,
  Briefcase,
  Clock,
  RefreshCw,
  Plus,
} from "lucide-react";
import { format, addWeeks, subWeeks, isToday, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import {
  setEngineerAvailabilityAdmin,
  blockEngineerTimeOff,
  initializeAllEngineersAvailability,
  type EngineerWithAvailability,
} from "@/lib/actions/engineer";

interface AdminAvailabilityClientProps {
  engineers: EngineerWithAvailability[];
  weekDates: Date[];
  weekStart: Date;
}

export function AdminAvailabilityClient({
  engineers,
  weekDates,
  weekStart,
}: AdminAvailabilityClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerWithAvailability | null>(null);
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [timeOffStart, setTimeOffStart] = useState("");
  const [timeOffEnd, setTimeOffEnd] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = direction === "prev" ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
    router.push(`/admin/engineers/availability?week=${format(newDate, "yyyy-MM-dd")}`);
  };

  const goToToday = () => {
    router.push("/admin/engineers/availability");
  };

  const toggleAvailability = async (
    engineerProfileId: string,
    date: Date,
    slot: "AM" | "PM",
    currentlyAvailable: boolean
  ) => {
    const result = await setEngineerAvailabilityAdmin(engineerProfileId, [
      { date, slot, isAvailable: !currentlyAvailable },
    ]);

    if (result.success) {
      toast.success(`Availability updated`);
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(result.error || "Failed to update availability");
    }
  };

  const handleBlockTimeOff = async () => {
    if (!selectedEngineer || !timeOffStart || !timeOffEnd) {
      toast.error("Please fill in all required fields");
      return;
    }

    const result = await blockEngineerTimeOff(
      selectedEngineer.id,
      new Date(timeOffStart),
      new Date(timeOffEnd),
      timeOffReason || undefined
    );

    if (result.success) {
      toast.success("Time off blocked successfully");
      setShowTimeOffDialog(false);
      setTimeOffStart("");
      setTimeOffEnd("");
      setTimeOffReason("");
      setSelectedEngineer(null);
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(result.error || "Failed to block time off");
    }
  };

  const handleInitializeAll = async () => {
    const result = await initializeAllEngineersAvailability();

    if (result.success) {
      toast.success(`Initialized availability for ${result.count} engineers`);
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error(result.error || "Failed to initialize availability");
    }
  };

  const getSlotStatus = (
    engineer: EngineerWithAvailability,
    date: Date,
    slot: "AM" | "PM"
  ): { available: boolean; hasBooking: boolean; bookingName?: string } => {
    const dateStr = format(date, "yyyy-MM-dd");

    // Check for booking
    const booking = engineer.bookings.find(
      (b) =>
        format(new Date(b.date), "yyyy-MM-dd") === dateStr &&
        (b.slot === slot || b.slot === "FULL_DAY")
    );

    if (booking) {
      return { available: false, hasBooking: true, bookingName: booking.serviceName };
    }

    // Check availability record
    const availability = engineer.availability.find(
      (a) =>
        format(new Date(a.date), "yyyy-MM-dd") === dateStr &&
        (a.slot === slot || a.slot === "FULL_DAY")
    );

    // Default to available if no record exists
    const available = availability ? availability.isAvailable : true;

    return { available, hasBooking: false };
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
              <span className="ml-4 font-medium">
                {format(weekStart, "MMMM d")} - {format(weekDates[6], "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleInitializeAll}
                disabled={isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                Initialize All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
          <span className="text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
          <span className="text-gray-600">Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
          <span className="text-gray-600">Past</span>
        </div>
      </div>

      {/* Engineers Grid */}
      {engineers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No approved engineers</p>
            <p className="text-sm mt-2">
              Approve engineers to manage their availability
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {engineers.map((engineer) => (
            <Card key={engineer.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{engineer.name}</CardTitle>
                      <p className="text-xs text-gray-500">{engineer.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEngineer(engineer);
                      setShowTimeOffDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Block Time Off
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-8 gap-1">
                  {/* Header row */}
                  <div className="text-xs font-medium text-gray-500 py-1" />
                  {weekDates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className={`text-center py-1 ${
                        isToday(date) ? "bg-blue-50 rounded" : ""
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-500">
                        {format(date, "EEE")}
                      </div>
                      <div
                        className={`text-sm ${
                          isToday(date) ? "font-bold text-blue-600" : ""
                        }`}
                      >
                        {format(date, "d")}
                      </div>
                    </div>
                  ))}

                  {/* AM row */}
                  <div className="text-xs font-medium text-gray-500 py-2 flex items-center">
                    AM
                  </div>
                  {weekDates.map((date) => {
                    const isPast = isBefore(date, startOfDay(new Date()));
                    const status = getSlotStatus(engineer, date, "AM");

                    return (
                      <button
                        key={`${date.toISOString()}-AM`}
                        disabled={isPast || status.hasBooking}
                        onClick={() =>
                          toggleAvailability(engineer.id, date, "AM", status.available)
                        }
                        className={`h-10 rounded text-xs flex items-center justify-center transition-colors ${
                          isPast
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : status.hasBooking
                            ? "bg-blue-100 border border-blue-300 text-blue-700 cursor-not-allowed"
                            : status.available
                            ? "bg-green-100 border border-green-300 text-green-700 hover:bg-green-200"
                            : "bg-red-100 border border-red-300 text-red-700 hover:bg-red-200"
                        }`}
                        title={
                          status.hasBooking
                            ? status.bookingName
                            : status.available
                            ? "Click to mark unavailable"
                            : "Click to mark available"
                        }
                      >
                        {status.hasBooking ? (
                          <Briefcase className="h-3 w-3" />
                        ) : status.available ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    );
                  })}

                  {/* PM row */}
                  <div className="text-xs font-medium text-gray-500 py-2 flex items-center">
                    PM
                  </div>
                  {weekDates.map((date) => {
                    const isPast = isBefore(date, startOfDay(new Date()));
                    const status = getSlotStatus(engineer, date, "PM");

                    return (
                      <button
                        key={`${date.toISOString()}-PM`}
                        disabled={isPast || status.hasBooking}
                        onClick={() =>
                          toggleAvailability(engineer.id, date, "PM", status.available)
                        }
                        className={`h-10 rounded text-xs flex items-center justify-center transition-colors ${
                          isPast
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : status.hasBooking
                            ? "bg-blue-100 border border-blue-300 text-blue-700 cursor-not-allowed"
                            : status.available
                            ? "bg-green-100 border border-green-300 text-green-700 hover:bg-green-200"
                            : "bg-red-100 border border-red-300 text-red-700 hover:bg-red-200"
                        }`}
                        title={
                          status.hasBooking
                            ? status.bookingName
                            : status.available
                            ? "Click to mark unavailable"
                            : "Click to mark available"
                        }
                      >
                        {status.hasBooking ? (
                          <Briefcase className="h-3 w-3" />
                        ) : status.available ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Block Time Off Dialog */}
      <Dialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Time Off</DialogTitle>
            <DialogDescription>
              Block time off for {selectedEngineer?.name}. All slots in the selected date
              range will be marked as unavailable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={timeOffStart}
                  onChange={(e) => setTimeOffStart(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={timeOffEnd}
                  onChange={(e) => setTimeOffEnd(e.target.value)}
                  min={timeOffStart || format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Annual Leave, Training, Sick"
                value={timeOffReason}
                onChange={(e) => setTimeOffReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeOffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBlockTimeOff}>Block Time Off</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
