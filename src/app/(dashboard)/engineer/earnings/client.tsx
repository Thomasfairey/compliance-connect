"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import { PoundSterling, Briefcase, Clock, TrendingUp } from "lucide-react";

interface EarningsStats {
  total: number;
  jobCount: number;
  hours: number;
  avgPerJob: number;
  avgPerHour: number;
}

interface RecentJob {
  id: string;
  customerName: string;
  serviceName: string;
  completedAt: string;
  earnings: number;
  quotedPrice: number;
}

interface EarningsClientProps {
  weeklyStats: EarningsStats;
  monthlyStats: EarningsStats;
  recentJobs: RecentJob[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EarningsClient({ weeklyStats, monthlyStats, recentJobs }: EarningsClientProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const stats = period === "week" ? weeklyStats : monthlyStats;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold">Earnings</h1>
      </header>

      {/* Period Selector */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex gap-2">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              This {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Earnings Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <p className="text-green-100 text-sm">Total Earnings</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(stats.total)}</p>
          <div className="flex items-center gap-4 mt-4 text-sm text-green-100">
            <span>{stats.jobCount} jobs</span>
            <span>•</span>
            <span>{stats.hours}h worked</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold">{stats.jobCount}</p>
          <p className="text-sm text-gray-500">Jobs Completed</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold">{stats.hours}h</p>
          <p className="text-sm text-gray-500">Hours Worked</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-2">
            <PoundSterling className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgPerJob)}</p>
          <p className="text-sm text-gray-500">Avg per Job</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgPerHour)}</p>
          <p className="text-sm text-gray-500">Avg per Hour</p>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="p-4 mt-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Recent Jobs</h2>
        {recentJobs.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-center text-gray-500">
            <PoundSterling className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No completed jobs yet</p>
            <p className="text-sm">Complete jobs to see your earnings</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/engineer/jobs/${job.id}`}
                className="block bg-white rounded-xl border p-3 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{job.customerName}</p>
                    <p className="text-sm text-gray-500">
                      {job.serviceName} • {format(parseISO(job.completedAt), "d MMM")}
                    </p>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(job.earnings)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="px-4 pb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Earnings shown are your estimated share (60%) of the job value.
            Actual payments are processed weekly.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav current="earnings" />
    </div>
  );
}
