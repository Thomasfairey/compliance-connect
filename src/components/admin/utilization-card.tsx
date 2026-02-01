"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle } from "lucide-react";
import type { UtilizationData } from "@/lib/actions/admin-analytics";

type UtilizationCardProps = {
  data: UtilizationData;
};

export function UtilizationCard({ data }: UtilizationCardProps) {
  const {
    totalEngineers,
    workingToday,
    workingThisWeek,
    atCapacity,
    utilizationPercent,
  } = data;

  // Determine color based on utilization
  const getUtilizationColor = () => {
    if (utilizationPercent >= 90) return "text-red-600";
    if (utilizationPercent >= 70) return "text-amber-600";
    return "text-green-600";
  };

  const getUtilizationBg = () => {
    if (utilizationPercent >= 90) return "bg-red-100";
    if (utilizationPercent >= 70) return "bg-amber-100";
    return "bg-green-100";
  };

  const getStrokeDasharray = () => {
    const circumference = 2 * Math.PI * 45; // radius = 45
    const filled = (utilizationPercent / 100) * circumference;
    return `${filled} ${circumference}`;
  };

  const getStrokeColor = () => {
    if (utilizationPercent >= 90) return "#dc2626"; // red-600
    if (utilizationPercent >= 70) return "#d97706"; // amber-600
    return "#16a34a"; // green-600
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Engineer Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={getStrokeColor()}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={getStrokeDasharray()}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getUtilizationColor()}`}>
                {utilizationPercent}%
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Working today</span>
              </div>
              <span className="font-semibold">
                {workingToday} / {totalEngineers}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">This week</span>
              </div>
              <span className="font-semibold">
                {workingThisWeek} / {totalEngineers}
              </span>
            </div>

            {atCapacity > 0 && (
              <div
                className={`flex items-center justify-between p-2 rounded-lg ${getUtilizationBg()}`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${getUtilizationColor()}`} />
                  <span className={`text-sm font-medium ${getUtilizationColor()}`}>
                    At capacity
                  </span>
                </div>
                <span className={`font-bold ${getUtilizationColor()}`}>
                  {atCapacity}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
