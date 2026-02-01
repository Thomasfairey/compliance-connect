"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { GeographicData, GeographicArea } from "@/lib/actions/admin-analytics";

type GeographicSalesCardProps = {
  data: GeographicData;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function AreaRow({ area }: { area: GeographicArea }) {
  const getTrendIcon = () => {
    switch (area.trend) {
      case "hot":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "cold":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendBg = () => {
    switch (area.trend) {
      case "hot":
        return "bg-green-50 border-green-200";
      case "cold":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTrendText = () => {
    switch (area.trend) {
      case "hot":
        return "text-green-700";
      case "cold":
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg border ${getTrendBg()}`}
    >
      <div className="flex items-center gap-2">
        {getTrendIcon()}
        <span className={`font-medium ${getTrendText()}`}>{area.postcode}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">{formatCurrency(area.revenue)}</span>
        <span className={`font-semibold ${getTrendText()} w-12 text-right`}>
          {area.bookingCount} jobs
        </span>
      </div>
    </div>
  );
}

export function GeographicSalesCard({ data }: GeographicSalesCardProps) {
  const { areas, hotAreas, coldAreas } = data;

  // Get top performing and underperforming areas
  const topAreas = areas.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-600" />
          Sales by Region
        </CardTitle>
        <p className="text-xs text-gray-500">Last 90 days by postcode area</p>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No geographic data available</p>
          </div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex gap-2 mb-4">
              {hotAreas.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <TrendingUp className="h-3 w-3" />
                  {hotAreas.length} hot {hotAreas.length === 1 ? "area" : "areas"}
                </div>
              )}
              {coldAreas.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  <TrendingDown className="h-3 w-3" />
                  {coldAreas.length} cold {coldAreas.length === 1 ? "area" : "areas"}
                </div>
              )}
            </div>

            {/* Area list */}
            <div className="space-y-2">
              {topAreas.map((area) => (
                <AreaRow key={area.postcode} area={area} />
              ))}
            </div>

            {areas.length > 5 && (
              <p className="text-xs text-gray-400 text-center mt-3">
                +{areas.length - 5} more areas
              </p>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Hot</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Warm</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Cold</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
