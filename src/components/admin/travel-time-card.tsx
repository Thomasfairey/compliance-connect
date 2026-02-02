"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, TrendingDown, Clock } from "lucide-react";
import type { TravelTimeData } from "@/lib/actions/admin-analytics";

type TravelTimeCardProps = {
  data: TravelTimeData;
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TravelTimeCard({ data }: TravelTimeCardProps) {
  const {
    todayEstimated,
    todayOptimized,
    savingsPercent,
    weekTotal,
  } = data;

  const savedMinutes = todayEstimated - todayOptimized;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-indigo-600" />
          Travel Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Today's comparison */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Today (Estimated)</div>
              <div className="text-2xl font-bold text-gray-700">
                {formatMinutes(todayEstimated)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Optimized</div>
              <div className="text-2xl font-bold text-indigo-600">
                {formatMinutes(todayOptimized)}
              </div>
            </div>
          </div>

          {/* Savings bar */}
          {savingsPercent > 0 && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Route Optimization Savings
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    {formatMinutes(savedMinutes)}
                  </span>
                  <span className="text-sm text-green-600 ml-1">
                    ({savingsPercent}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Week total */}
          <div className="pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">This week total</span>
            </div>
            <span className="font-semibold">{formatMinutes(weekTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
