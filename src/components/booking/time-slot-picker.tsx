"use client";

import { Clock, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS, type TimeSlot } from "@/types";

type TimeSlotPickerProps = {
  selected?: TimeSlot;
  onSelect: (slot: TimeSlot) => void;
  estimatedDuration?: number; // in minutes
};

const getPeriodIcon = (slot: TimeSlot) => {
  const hour = parseInt(slot.split(":")[0]);
  if (hour < 12) return Sun;
  if (hour < 17) return Sunset;
  return Moon;
};

const getPeriodColor = (slot: TimeSlot, isSelected: boolean) => {
  const hour = parseInt(slot.split(":")[0]);
  if (isSelected) {
    if (hour < 12) return "bg-amber-500 text-white border-amber-500";
    if (hour < 17) return "bg-orange-500 text-white border-orange-500";
    return "bg-indigo-500 text-white border-indigo-500";
  }
  if (hour < 12) return "border-amber-200 hover:border-amber-400 hover:bg-amber-50";
  if (hour < 17) return "border-orange-200 hover:border-orange-400 hover:bg-orange-50";
  return "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50";
};

export function TimeSlotPicker({
  selected,
  onSelect,
  estimatedDuration,
}: TimeSlotPickerProps) {
  // Group slots by period
  const morningSlots = TIME_SLOTS.filter((s) => parseInt(s.value.split(":")[0]) < 12);
  const afternoonSlots = TIME_SLOTS.filter((s) => {
    const hour = parseInt(s.value.split(":")[0]);
    return hour >= 12;
  });

  const formatEndTime = (startSlot: TimeSlot, durationMinutes: number) => {
    const [hours, mins] = startSlot.split(":").map(Number);
    const startMinutes = hours * 60 + mins;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const period = endHours >= 12 ? "PM" : "AM";
    const displayHours = endHours > 12 ? endHours - 12 : endHours === 0 ? 12 : endHours;
    return `${displayHours}:${endMins.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Morning slots */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sun className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-muted-foreground">Morning</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {morningSlots.map((slot) => {
            const Icon = getPeriodIcon(slot.value);
            const isSelected = selected === slot.value;

            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => onSelect(slot.value)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-left",
                  getPeriodColor(slot.value, isSelected)
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{slot.label}</span>
                </div>
                {estimatedDuration && isSelected && (
                  <p className="text-xs opacity-75">
                    Until ~{formatEndTime(slot.value, estimatedDuration)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Afternoon slots */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sunset className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-muted-foreground">Afternoon</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {afternoonSlots.map((slot) => {
            const Icon = getPeriodIcon(slot.value);
            const isSelected = selected === slot.value;

            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => onSelect(slot.value)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-left",
                  getPeriodColor(slot.value, isSelected)
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{slot.label}</span>
                </div>
                {estimatedDuration && isSelected && (
                  <p className="text-xs opacity-75">
                    Until ~{formatEndTime(slot.value, estimatedDuration)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info box */}
      {estimatedDuration && selected && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Estimated job duration: <strong>{Math.floor(estimatedDuration / 60)}h {estimatedDuration % 60}m</strong>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Starting at {TIME_SLOTS.find(s => s.value === selected)?.label}, finishing around{" "}
            {formatEndTime(selected, estimatedDuration)}
          </p>
        </div>
      )}
    </div>
  );
}
