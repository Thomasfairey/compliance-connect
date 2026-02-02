"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// Types for analytics data
export type QuickStats = {
  todayJobs: number;
  todayRevenue: number;
  pendingCount: number;
  overdueCount: number;
  averageJobPrice: number;
  averageJobPriceChange: number; // % change vs last month
};

export type UtilizationData = {
  totalEngineers: number;
  workingToday: number;
  workingThisWeek: number;
  atCapacity: number;
  utilizationPercent: number;
};

export type TravelTimeData = {
  todayEstimated: number; // minutes
  todayOptimized: number; // minutes after optimization
  savingsPercent: number;
  weekTotal: number; // minutes
};

export type ServiceCategory = {
  name: string;
  count: number;
  revenue: number;
};

export type JobsByCategoryData = {
  today: ServiceCategory[];
  week: ServiceCategory[];
};

export type GeographicArea = {
  postcode: string;
  bookingCount: number;
  revenue: number;
  trend: "hot" | "warm" | "cold";
};

export type GeographicData = {
  areas: GeographicArea[];
  hotAreas: string[];
  coldAreas: string[];
};

export type AdminDashboardAnalytics = {
  quickStats: QuickStats;
  utilization: UtilizationData;
  travelTime: TravelTimeData;
  jobsByCategory: JobsByCategoryData;
  geographic: GeographicData;
};

// Helper functions
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function getAdminDashboardAnalytics(): Promise<AdminDashboardAnalytics> {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = getStartOfWeek(now);
  const weekEnd = getEndOfWeek(now);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Parallel queries for performance
  const [
    approvedEngineers,
    todayBookings,
    weekBookings,
    pendingCount,
    overdueCount,
    recentBookingsWithSites,
    avgPriceLast30Days,
    avgPricePrev30Days,
  ] = await Promise.all([
    // Get all approved engineers
    db.engineerProfile.findMany({
      where: { status: "APPROVED" },
      select: { userId: true },
    }),

    // Get today's bookings (excluding cancelled)
    db.booking.findMany({
      where: {
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
      include: {
        service: { select: { name: true } },
        engineer: { select: { id: true, name: true } },
        site: { select: { postcode: true } },
      },
    }),

    // Get this week's bookings (excluding cancelled)
    db.booking.findMany({
      where: {
        scheduledDate: { gte: weekStart, lte: weekEnd },
        status: { not: "CANCELLED" },
      },
      include: {
        service: { select: { name: true } },
      },
    }),

    // Count pending bookings (need engineer assignment)
    db.booking.count({
      where: { status: "PENDING" },
    }),

    // Count overdue compliance items
    db.complianceReminder.count({
      where: {
        nextDueDate: { lt: todayStart },
      },
    }),

    // Get recent bookings with site info for geographic analysis
    db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        scheduledDate: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
      },
      include: {
        site: { select: { postcode: true } },
      },
      orderBy: { scheduledDate: "desc" },
    }),

    // Average job price last 30 days
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        scheduledDate: { gte: thirtyDaysAgo },
      },
      _avg: { quotedPrice: true },
      _count: true,
    }),

    // Average job price previous 30 days (for comparison)
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        scheduledDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _avg: { quotedPrice: true },
      _count: true,
    }),
  ]);

  // Calculate quick stats
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.quotedPrice, 0);

  // Calculate utilization
  const engineersWithJobsToday = new Set(
    todayBookings
      .filter((b) => b.engineerId)
      .map((b) => b.engineerId)
  );

  const engineersWithJobsThisWeek = new Set(
    weekBookings
      .filter((b) => b.engineerId)
      .map((b) => b.engineerId)
  );

  // Count engineers at capacity (2+ jobs today)
  const jobsPerEngineerToday = new Map<string, number>();
  todayBookings.forEach((b) => {
    if (b.engineerId) {
      jobsPerEngineerToday.set(
        b.engineerId,
        (jobsPerEngineerToday.get(b.engineerId) || 0) + 1
      );
    }
  });
  const atCapacity = Array.from(jobsPerEngineerToday.values()).filter(
    (count) => count >= 2
  ).length;

  const totalEngineers = approvedEngineers.length;
  const utilizationPercent =
    totalEngineers > 0
      ? Math.round((engineersWithJobsToday.size / totalEngineers) * 100)
      : 0;

  // Calculate jobs by category
  const todayByService = new Map<string, { count: number; revenue: number }>();
  todayBookings.forEach((b) => {
    const serviceName = b.service.name;
    const existing = todayByService.get(serviceName) || { count: 0, revenue: 0 };
    todayByService.set(serviceName, {
      count: existing.count + 1,
      revenue: existing.revenue + b.quotedPrice,
    });
  });

  const weekByService = new Map<string, { count: number; revenue: number }>();
  weekBookings.forEach((b) => {
    const serviceName = b.service.name;
    const existing = weekByService.get(serviceName) || { count: 0, revenue: 0 };
    weekByService.set(serviceName, {
      count: existing.count + 1,
      revenue: existing.revenue + b.quotedPrice,
    });
  });

  // Calculate geographic distribution
  const byPostcode = new Map<string, { count: number; revenue: number }>();
  recentBookingsWithSites.forEach((b) => {
    const prefix = b.site.postcode.substring(0, 2).toUpperCase().replace(/\d/g, "");
    const existing = byPostcode.get(prefix) || { count: 0, revenue: 0 };
    byPostcode.set(prefix, {
      count: existing.count + 1,
      revenue: existing.revenue + b.quotedPrice,
    });
  });

  // Determine hot/warm/cold areas
  const areaEntries = Array.from(byPostcode.entries()).map(([postcode, data]) => ({
    postcode,
    bookingCount: data.count,
    revenue: data.revenue,
  }));

  // Sort by booking count to determine thresholds
  const sortedByCount = [...areaEntries].sort((a, b) => b.bookingCount - a.bookingCount);
  const maxCount = sortedByCount[0]?.bookingCount || 0;
  const hotThreshold = maxCount * 0.6;
  const warmThreshold = maxCount * 0.3;

  const areas: GeographicArea[] = areaEntries
    .map((area) => ({
      ...area,
      trend: (area.bookingCount >= hotThreshold
        ? "hot"
        : area.bookingCount >= warmThreshold
        ? "warm"
        : "cold") as "hot" | "warm" | "cold",
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount);

  const hotAreas = areas.filter((a) => a.trend === "hot").map((a) => a.postcode);
  const coldAreas = areas.filter((a) => a.trend === "cold").map((a) => a.postcode);

  // Format category data
  const formatCategoryData = (
    map: Map<string, { count: number; revenue: number }>
  ): ServiceCategory[] => {
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Calculate average job price and change
  const currentAvgPrice = avgPriceLast30Days._avg.quotedPrice || 0;
  const previousAvgPrice = avgPricePrev30Days._avg.quotedPrice || 0;
  const avgPriceChange =
    previousAvgPrice > 0
      ? Math.round(((currentAvgPrice - previousAvgPrice) / previousAvgPrice) * 100)
      : 0;

  // Estimate travel time for today's bookings
  // Simple estimation: ~20 min average per job transit + 15 min base optimization savings
  const todayJobCount = todayBookings.length;
  const estimatedTravelMinutes = todayJobCount * 25; // Rough estimate per job
  const optimizedTravelMinutes = Math.round(estimatedTravelMinutes * 0.75); // ~25% savings from optimization
  const travelSavingsPercent =
    estimatedTravelMinutes > 0
      ? Math.round(
          ((estimatedTravelMinutes - optimizedTravelMinutes) / estimatedTravelMinutes) * 100
        )
      : 0;

  // Week total travel estimate
  const weekJobCount = weekBookings.length;
  const weekTravelMinutes = weekJobCount * 20; // Slightly lower per-job average for week

  return {
    quickStats: {
      todayJobs: todayBookings.length,
      todayRevenue,
      pendingCount,
      overdueCount,
      averageJobPrice: Math.round(currentAvgPrice),
      averageJobPriceChange: avgPriceChange,
    },
    utilization: {
      totalEngineers,
      workingToday: engineersWithJobsToday.size,
      workingThisWeek: engineersWithJobsThisWeek.size,
      atCapacity,
      utilizationPercent,
    },
    travelTime: {
      todayEstimated: estimatedTravelMinutes,
      todayOptimized: optimizedTravelMinutes,
      savingsPercent: travelSavingsPercent,
      weekTotal: weekTravelMinutes,
    },
    jobsByCategory: {
      today: formatCategoryData(todayByService),
      week: formatCategoryData(weekByService),
    },
    geographic: {
      areas,
      hotAreas,
      coldAreas,
    },
  };
}
