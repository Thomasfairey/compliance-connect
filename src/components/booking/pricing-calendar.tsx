"use client";

import { useState, useEffect, useCallback } from "react";
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
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDateRangeDiscounts } from "@/lib/actions";

type DayDiscount = {
  date: string;
  discountPercent: number;
  discountReason?: string;
};

type PricingCalendarProps = {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  serviceId?: string;
  siteId?: string;
  estimatedQty?: number;
  disabled?: (date: Date) => boolean;
};

export function PricingCalendar({
  selected,
  onSelect,
  serviceId,
  siteId,
  estimatedQty,
  disabled,
}: PricingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [discounts, setDiscounts] = useState<Map<string, DayDiscount>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // Fetch discounts for visible month
  const fetchDiscounts = useCallback(async () => {
    if (!serviceId || !siteId || !estimatedQty) {
      setDiscounts(new Map());
      return;
    }

    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const results = await getDateRangeDiscounts(
        serviceId,
        siteId,
        start,
        end,
        estimatedQty
      );

      const discountMap = new Map<string, DayDiscount>();
      results.forEach((r) => {
        discountMap.set(r.date, r);
      });
      setDiscounts(discountMap);
    } catch (error) {
      console.error("Failed to fetch discounts:", error);
    }
    setLoading(false);
  }, [serviceId, siteId, estimatedQty, currentMonth]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

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

  const getDiscountColor = (discountPercent: number) => {
    if (discountPercent >= 50) return "bg-green-500";
    if (discountPercent >= 25) return "bg-green-400";
    if (discountPercent >= 10) return "bg-amber-400";
    return "";
  };

  const getDiscountBgColor = (discountPercent: number) => {
    if (discountPercent >= 50) return "bg-green-50 hover:bg-green-100 border-green-200";
    if (discountPercent >= 25) return "bg-green-50/50 hover:bg-green-100/50 border-green-100";
    if (discountPercent >= 10) return "bg-amber-50 hover:bg-amber-100 border-amber-200";
    return "hover:bg-muted/50";
  };

  const hoveredDiscount = hoveredDate ? discounts.get(hoveredDate) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
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

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking for discounts...</span>
        </div>
      )}

      {/* Legend */}
      {serviceId && siteId && estimatedQty && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>50% off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400" />
            <span>25% off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span>10% off</span>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
            <div
              key={dayName}
              className="py-2 text-center text-sm font-medium text-muted-foreground"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="divide-y">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x">
              {week.map((dayDate) => {
                const dateStr = format(dayDate, "yyyy-MM-dd");
                const discount = discounts.get(dateStr);
                const isCurrentMonth = isSameMonth(dayDate, currentMonth);
                const isSelected = selected && isSameDay(dayDate, selected);
                const isToday = isSameDay(dayDate, today);
                const isPast = isBefore(dayDate, today);
                const isDisabled = disabled?.(dayDate) || isPast;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onSelect(dayDate)}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={cn(
                      "relative h-16 p-1 transition-all text-left",
                      !isCurrentMonth && "text-muted-foreground/40 bg-muted/20",
                      isCurrentMonth && !isDisabled && getDiscountBgColor(discount?.discountPercent || 0),
                      isDisabled && "cursor-not-allowed opacity-50",
                      isSelected && "ring-2 ring-primary ring-inset bg-primary/10",
                      isToday && !isSelected && "ring-1 ring-primary/50 ring-inset"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isToday && "text-primary font-bold",
                        isSelected && "text-primary"
                      )}
                    >
                      {format(dayDate, "d")}
                    </span>

                    {/* Discount indicator */}
                    {discount && discount.discountPercent > 0 && isCurrentMonth && !isDisabled && (
                      <div className="absolute bottom-1 right-1">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                            getDiscountColor(discount.discountPercent)
                          )}
                        >
                          {discount.discountPercent}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hovered discount info */}
      {hoveredDiscount && hoveredDiscount.discountPercent > 0 && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">
              {hoveredDiscount.discountPercent}% Discount Available
            </span>
          </div>
          {hoveredDiscount.discountReason && (
            <p className="text-sm text-green-700 mt-1">
              {hoveredDiscount.discountReason}
            </p>
          )}
        </div>
      )}

      {/* Selected date discount */}
      {selected && !hoveredDate && (
        <SelectedDateInfo
          date={selected}
          discount={discounts.get(format(selected, "yyyy-MM-dd"))}
        />
      )}
    </div>
  );
}

function SelectedDateInfo({
  date,
  discount,
}: {
  date: Date;
  discount?: DayDiscount;
}) {
  if (!discount) return null;

  if (discount.discountPercent > 0) {
    return (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-800">
            {discount.discountPercent}% Discount on {format(date, "EEEE, d MMMM")}!
          </span>
        </div>
        {discount.discountReason && (
          <p className="text-sm text-green-700">{discount.discountReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 border">
      <p className="text-sm text-muted-foreground">
        No discounts available for {format(date, "EEEE, d MMMM")}
      </p>
    </div>
  );
}
