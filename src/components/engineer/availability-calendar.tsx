"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay, isAfter, startOfDay } from "date-fns";
import { setEngineerAvailability } from "@/lib/actions/engineer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Calendar,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";

type AvailabilitySlot = {
  date: Date;
  slot: "AM" | "PM";
  isAvailable: boolean;
};

type Props = {
  initialAvailability?: { date: Date; slot: string; isAvailable: boolean }[];
  calendarSyncs?: { provider: string; lastSyncedAt: Date | null }[];
};

export function AvailabilityCalendar({ initialAvailability = [], calendarSyncs = [] }: Props) {
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Map<string, boolean>>(() => {
    const map = new Map();
    initialAvailability.forEach((a) => {
      const key = `${format(a.date, "yyyy-MM-dd")}-${a.slot}`;
      map.set(key, a.isAvailable);
    });
    return map;
  });
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = startOfDay(new Date());

  const getSlotKey = (date: Date, slot: "AM" | "PM") =>
    `${format(date, "yyyy-MM-dd")}-${slot}`;

  const isSlotAvailable = (date: Date, slot: "AM" | "PM") => {
    const key = getSlotKey(date, slot);
    if (changes.has(key)) return changes.get(key);
    if (availability.has(key)) return availability.get(key);
    return true; // Default to available
  };

  const toggleSlot = (date: Date, slot: "AM" | "PM") => {
    if (!isAfter(date, addDays(today, -1))) return; // Can't change past dates

    const key = getSlotKey(date, slot);
    const currentValue = isSlotAvailable(date, slot);
    const newChanges = new Map(changes);
    newChanges.set(key, !currentValue);
    setChanges(newChanges);
  };

  const handleSave = async () => {
    if (changes.size === 0) return;

    setLoading(true);
    try {
      const updates = Array.from(changes.entries()).map(([key, isAvailable]) => {
        const [dateStr, slot] = key.split("-");
        const slotPart = slot as "AM" | "PM";
        return {
          date: new Date(dateStr + "T00:00:00"),
          slot: slotPart,
          isAvailable,
        };
      });

      const result = await setEngineerAvailability(updates);

      if (result.success) {
        toast.success("Availability updated!");
        // Merge changes into availability
        changes.forEach((value, key) => {
          availability.set(key, value);
        });
        setChanges(new Map());
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update availability");
      }
    } catch {
      toast.error("Failed to update availability");
    }
    setLoading(false);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const hasUnsavedChanges = changes.size > 0;

  return (
    <div className="space-y-6">
      {/* Calendar Sync Status */}
      {calendarSyncs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Calendar Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {calendarSyncs.map((sync, index) => (
                <Badge key={index} variant="secondary" className="py-1.5 px-3">
                  <span className="capitalize">{sync.provider}</span>
                  {sync.lastSyncedAt && (
                    <span className="ml-2 text-muted-foreground">
                      Last synced: {format(sync.lastSyncedAt, "MMM d, h:mm a")}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Your calendar is automatically synced to block out busy times.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Availability Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Availability
              </CardTitle>
              <CardDescription>
                Click on slots to toggle availability. Green = available, Red = unavailable.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToThisWeek}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground w-20">
                    Slot
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={`p-2 text-center text-sm font-medium ${
                        isSameDay(day, today)
                          ? "bg-primary/10 text-primary rounded-t-lg"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div>{format(day, "EEE")}</div>
                      <div className={`text-lg ${isSameDay(day, today) ? "font-bold" : ""}`}>
                        {format(day, "d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* AM Row */}
                <tr>
                  <td className="p-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>AM</span>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const isPast = !isAfter(day, addDays(today, -1));
                    const isAvailable = isSlotAvailable(day, "AM");
                    const key = getSlotKey(day, "AM");
                    const hasChange = changes.has(key);

                    return (
                      <td key={`${day.toISOString()}-AM`} className="p-1">
                        <button
                          onClick={() => toggleSlot(day, "AM")}
                          disabled={isPast}
                          className={`w-full h-12 rounded-lg transition-all flex items-center justify-center ${
                            isPast
                              ? "bg-muted cursor-not-allowed opacity-50"
                              : isAvailable
                              ? "bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-200"
                              : "bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-200"
                          } ${hasChange ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        >
                          {isAvailable ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>

                {/* PM Row */}
                <tr>
                  <td className="p-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>PM</span>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const isPast = !isAfter(day, addDays(today, -1));
                    const isAvailable = isSlotAvailable(day, "PM");
                    const key = getSlotKey(day, "PM");
                    const hasChange = changes.has(key);

                    return (
                      <td key={`${day.toISOString()}-PM`} className="p-1">
                        <button
                          onClick={() => toggleSlot(day, "PM")}
                          disabled={isPast}
                          className={`w-full h-12 rounded-lg transition-all flex items-center justify-center ${
                            isPast
                              ? "bg-muted cursor-not-allowed opacity-50"
                              : isAvailable
                              ? "bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-200"
                              : "bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-200"
                          } ${hasChange ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        >
                          {isAvailable ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-200 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-700" />
              </div>
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-200 flex items-center justify-center">
                <X className="w-3 h-3 text-red-700" />
              </div>
              <span className="text-muted-foreground">Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted" />
              <span className="text-muted-foreground">Past</span>
            </div>
          </div>

          {/* Save Button */}
          {hasUnsavedChanges && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {changes.size} unsaved change{changes.size !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setChanges(new Map())}
                  disabled={loading}
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="gradient-primary text-white"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mock Calendar Connect Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect Calendar</CardTitle>
          <CardDescription>
            Sync your calendar to automatically block out busy times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-12 justify-start gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google Calendar</span>
            </Button>
            <Button variant="outline" className="h-12 justify-start gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span>Apple Calendar</span>
            </Button>
            <Button variant="outline" className="h-12 justify-start gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#0078D4" d="M21.17 2.06A2.07 2.07 0 0 0 19.1 0H4.9A2.07 2.07 0 0 0 2.83 2.06v19.88A2.07 2.07 0 0 0 4.9 24h14.2a2.07 2.07 0 0 0 2.07-2.06V2.06z"/>
                <path fill="#fff" d="M17.5 6h-11v12h11V6z"/>
                <path fill="#0078D4" d="M8 8h8v2H8V8zm0 3h8v2H8v-2zm0 3h5v2H8v-2z"/>
              </svg>
              <span>Outlook</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Calendar sync is a demo feature. In production, this would connect to your actual calendar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
