"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Wrench, FileCheck, TrendingUp } from "lucide-react";
import type { CompensationSummary } from "@/lib/actions/compensation";

type EarningsSummaryProps = {
  summary: CompensationSummary;
};

export function EarningsSummary({ summary }: EarningsSummaryProps) {
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const periodLabel = `${summary.periodStart.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })} - ${summary.periodEnd.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-6">
      {/* Total Earnings Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-green-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total Earnings
          </CardTitle>
          <p className="text-sm text-green-600">{periodLabel}</p>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-green-700">
            {formatCurrency(summary.totalEarnings)}
          </p>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* PAT Testing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              PAT Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.patTests.earnings)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.patTests.count.toLocaleString()} items @ £0.45/test
            </p>
          </CardContent>
        </Card>

        {/* Electrical Work */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Electrical Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.electricianJobs.earnings)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.electricianJobs.count} jobs @ 40% of labour
            </p>
          </CardContent>
        </Card>

        {/* Consultant Work */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Consultant Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.consultantDays.earnings)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.consultantDays.count} days @ {formatCurrency(summary.consultantDays.dayRate)}/day
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
