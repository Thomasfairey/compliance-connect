"use client";

import { useState, useEffect } from "react";
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
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDateRangeDiscounts, type DatePricing } from "@/lib/actions";

type PricingCalendarProps = {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  serviceId?: string;
  siteId?: string;
  estimatedQty?: number;
  disabled?: (date: Date) => boolean;
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PricingCalendar({
  selected,
  onSelect,
  serviceId,
  siteId,
  estimatedQty,
  disabled,
}: PricingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pricing, setPricing] = useState<Map<string, DatePricing>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // Fetch pricing for visible month
  useEffect(() => {
    let cancelled = false;

    async function fetchPricing() {
      if (!serviceId || !siteId || !estimatedQty) {
        setPricing(new Map());
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

        if (!cancelled) {
          const pricingMap = new Map<string, DatePricing>();
          results.forEach((r) => {
            pricingMap.set(r.date, r);
          });
          setPricing(pricingMap);
        }
      } catch (error) {
        console.error("Failed to fetch pricing:", error);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    fetchPricing();

    return () => {
      cancelled = true;
    };
  }, [serviceId, siteId, estimatedQty, currentMonth]);

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
    if (discountPercent >= 15) return "bg-green-500";
    if (discountPercent >= 10) return "bg-green-400";
    if (discountPercent >= 5) return "bg-amber-400";
    return "";
  };

  const getDiscountBgColor = (discountPercent: number) => {
    if (discountPercent >= 15) return "bg-green-100 hover:bg-green-200 border-green-300";
    if (discountPercent >= 10) return "bg-green-50 hover:bg-green-100 border-green-200";
    if (discountPercent >= 5) return "bg-amber-50 hover:bg-amber-100 border-amber-200";
    return "hover:bg-muted/50";
  };

  const hoveredPricing = hoveredDate ? pricing.get(hoveredDate) : null;

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
          <span>Loading prices...</span>
        </div>
      )}

      {/* Legend */}
      {serviceId && siteId && estimatedQty && (
        <div className="flex flex-wrap gap-4 text-sm p-3 bg-gray-50 rounded-lg border">
          <span className="font-medium text-gray-700">Discounts:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>15%+ off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400" />
            <span>10%+ off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span>5%+ off</span>
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
                const dayPricing = pricing.get(dateStr);
                const isCurrentMonth = isSameMonth(dayDate, currentMonth);
                const isSelected = selected && isSameDay(dayDate, selected);
                const isToday = isSameDay(dayDate, today);
                // Demo mode: allow all dates to be selected
                const isDisabled = disabled?.(dayDate) ?? false;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onSelect(dayDate)}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={cn(
                      "relative h-20 p-1 transition-all text-left flex flex-col",
                      !isCurrentMonth && "text-muted-foreground/40 bg-muted/20",
                      isCurrentMonth && !isDisabled && getDiscountBgColor(dayPricing?.discountPercent || 0),
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

                    {/* Discount badge */}
                    {dayPricing && dayPricing.discountPercent > 0 && isCurrentMonth && !isDisabled && (
                      <div className={cn(
                        "absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded",
                        dayPricing.discountPercent >= 15 && "bg-green-500 text-white",
                        dayPricing.discountPercent >= 10 && dayPricing.discountPercent < 15 && "bg-green-400 text-white",
                        dayPricing.discountPercent >= 5 && dayPricing.discountPercent < 10 && "bg-amber-400 text-white"
                      )}>
                        -{dayPricing.discountPercent}%
                      </div>
                    )}

                    {/* Price display */}
                    {dayPricing && isCurrentMonth && !isDisabled && (
                      <div className="mt-auto">
                        <div
                          className={cn(
                            "text-xs font-semibold",
                            dayPricing.discountPercent >= 15 && "text-green-700",
                            dayPricing.discountPercent >= 10 && dayPricing.discountPercent < 15 && "text-green-600",
                            dayPricing.discountPercent >= 5 && dayPricing.discountPercent < 10 && "text-amber-600",
                            dayPricing.discountPercent === 0 && "text-gray-600"
                          )}
                        >
                          {formatPrice(dayPricing.discountedPrice)}
                        </div>
                        {dayPricing.discountPercent > 0 && (
                          <div className="text-[10px] text-muted-foreground line-through">
                            {formatPrice(dayPricing.originalPrice)}
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

      {/* Hovered pricing info */}
      {hoveredPricing && (
        <div className={cn(
          "p-3 rounded-lg animate-in fade-in duration-200",
          hoveredPricing.discountPercent > 0
            ? "bg-green-50 border border-green-200"
            : "bg-muted/50 border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hoveredPricing.discountPercent > 0 && (
                <Sparkles className="h-4 w-4 text-green-600" />
              )}
              <span className={cn(
                "font-medium",
                hoveredPricing.discountPercent > 0 ? "text-green-800" : "text-gray-700"
              )}>
                {formatPrice(hoveredPricing.discountedPrice)}
                {hoveredPricing.discountPercent > 0 && (
                  <span className="ml-2 text-sm">
                    ({hoveredPricing.discountPercent}% off)
                  </span>
                )}
              </span>
            </div>
            {hoveredPricing.discountPercent > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(hoveredPricing.originalPrice)}
              </span>
            )}
          </div>
          {hoveredPricing.discountReason && (
            <p className="text-sm text-green-700 mt-1">
              {hoveredPricing.discountReason}
            </p>
          )}
        </div>
      )}

      {/* Selected date pricing */}
      {selected && !hoveredDate && (
        <SelectedDateInfo
          date={selected}
          pricing={pricing.get(format(selected, "yyyy-MM-dd"))}
        />
      )}
    </div>
  );
}

function SelectedDateInfo({
  date,
  pricing: dayPricing,
}: {
  date: Date;
  pricing?: DatePricing;
}) {
  if (!dayPricing) return null;

  if (dayPricing.discountPercent > 0) {
    return (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">
              {formatPrice(dayPricing.discountedPrice)} on {format(date, "EEEE, d MMMM")}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-green-600 font-medium">
              Save {dayPricing.discountPercent}%
            </span>
            <span className="text-sm text-muted-foreground line-through ml-2">
              {formatPrice(dayPricing.originalPrice)}
            </span>
          </div>
        </div>
        {dayPricing.discountReason && (
          <p className="text-sm text-green-700">{dayPricing.discountReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {format(date, "EEEE, d MMMM")}
        </span>
        <span className="font-semibold">{formatPrice(dayPricing.discountedPrice)}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Standard price - check nearby dates for potential discounts
      </p>
    </div>
  );
}
