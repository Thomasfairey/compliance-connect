"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase } from "lucide-react";
import type { JobsByCategoryData, ServiceCategory } from "@/lib/actions/admin-analytics";

type JobsByCategoryCardProps = {
  data: JobsByCategoryData;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CategoryBar({ category, maxCount }: { category: ServiceCategory; maxCount: number }) {
  const widthPercent = maxCount > 0 ? (category.count / maxCount) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900 truncate">{category.name}</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-gray-500">{formatCurrency(category.revenue)}</span>
          <span className="font-semibold text-gray-900 w-8 text-right">
            {category.count}
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

export function JobsByCategoryCard({ data }: JobsByCategoryCardProps) {
  const [period, setPeriod] = useState<"today" | "week">("today");

  const categories = period === "today" ? data.today : data.week;
  const maxCount = Math.max(...categories.map((c) => c.count), 1);
  const totalJobs = categories.reduce((sum, c) => sum + c.count, 0);
  const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            Jobs by Service
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "today" | "week")}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-3">
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">
                This Week
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No jobs scheduled {period === "today" ? "today" : "this week"}</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div>
                <span className="text-2xl font-bold text-gray-900">{totalJobs}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {totalJobs === 1 ? "job" : "jobs"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(totalRevenue)}
                </span>
                <span className="text-sm text-gray-500 block">revenue</span>
              </div>
            </div>

            {/* Category bars */}
            <div className="space-y-4">
              {categories.slice(0, 5).map((category) => (
                <CategoryBar
                  key={category.name}
                  category={category}
                  maxCount={maxCount}
                />
              ))}
              {categories.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  +{categories.length - 5} more services
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
