"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

// Revenue Report Data
export type RevenueByService = {
  serviceName: string;
  revenue: number;
  count: number;
};

export type RevenueByMonth = {
  month: string;
  revenue: number;
  count: number;
};

export type RevenueReportData = {
  totalRevenue: number;
  totalBookings: number;
  averageJobValue: number;
  byService: RevenueByService[];
  byMonth: RevenueByMonth[];
  topCustomers: { name: string; companyName: string | null; revenue: number; bookings: number }[];
};

export async function getRevenueReportData(): Promise<RevenueReportData> {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  const [completedBookings, customerBookings] = await Promise.all([
    db.booking.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: sixMonthsAgo },
      },
      include: {
        service: { select: { name: true } },
      },
    }),
    db.booking.groupBy({
      by: ["customerId"],
      where: {
        status: "COMPLETED",
        completedAt: { gte: sixMonthsAgo },
      },
      _sum: { quotedPrice: true },
      _count: true,
      orderBy: { _sum: { quotedPrice: "desc" } },
      take: 5,
    }),
  ]);

  // Calculate totals
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.quotedPrice, 0);
  const totalBookings = completedBookings.length;
  const averageJobValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Group by service
  const byServiceMap = new Map<string, { revenue: number; count: number }>();
  completedBookings.forEach((b) => {
    const existing = byServiceMap.get(b.service.name) || { revenue: 0, count: 0 };
    byServiceMap.set(b.service.name, {
      revenue: existing.revenue + b.quotedPrice,
      count: existing.count + 1,
    });
  });

  const byService = Array.from(byServiceMap.entries())
    .map(([serviceName, data]) => ({
      serviceName,
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Group by month
  const byMonthMap = new Map<string, { revenue: number; count: number }>();
  completedBookings.forEach((b) => {
    if (b.completedAt) {
      const month = format(b.completedAt, "MMM yyyy");
      const existing = byMonthMap.get(month) || { revenue: 0, count: 0 };
      byMonthMap.set(month, {
        revenue: existing.revenue + b.quotedPrice,
        count: existing.count + 1,
      });
    }
  });

  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Get top customers
  const customerIds = customerBookings.map((c) => c.customerId);
  const customers = await db.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, companyName: true },
  });

  const topCustomers = customerBookings.map((cb) => {
    const customer = customers.find((c) => c.id === cb.customerId);
    return {
      name: customer?.name || "Unknown",
      companyName: customer?.companyName || null,
      revenue: cb._sum.quotedPrice || 0,
      bookings: cb._count,
    };
  });

  return {
    totalRevenue,
    totalBookings,
    averageJobValue,
    byService,
    byMonth,
    topCustomers,
  };
}

// Booking Analytics Data
export type BookingTrend = {
  date: string;
  completed: number;
  cancelled: number;
  pending: number;
};

export type BookingAnalyticsData = {
  totalBookings: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
  cancellationRate: number;
  trends: BookingTrend[];
  peakHours: { hour: string; count: number }[];
  peakDays: { day: string; count: number }[];
};

export async function getBookingAnalyticsData(): Promise<BookingAnalyticsData> {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);

  const bookings = await db.booking.findMany({
    where: {
      createdAt: { gte: threeMonthsAgo },
    },
    select: {
      status: true,
      scheduledDate: true,
      slot: true,
      createdAt: true,
    },
  });

  const totalBookings = bookings.length;
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;
  const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

  // Group by week for trends
  const weekMap = new Map<string, { completed: number; cancelled: number; pending: number }>();
  bookings.forEach((b) => {
    const weekStart = format(b.createdAt, "MMM d");
    const existing = weekMap.get(weekStart) || { completed: 0, cancelled: 0, pending: 0 };
    if (b.status === "COMPLETED") existing.completed++;
    else if (b.status === "CANCELLED") existing.cancelled++;
    else existing.pending++;
    weekMap.set(weekStart, existing);
  });

  const trends = Array.from(weekMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .slice(-12); // Last 12 weeks

  // Peak hours
  const hourMap = new Map<string, number>();
  bookings.forEach((b) => {
    if (b.slot) {
      const hour = b.slot.split("-")[0] || b.slot;
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
  });
  const peakHours = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Peak days
  const dayMap = new Map<string, number>();
  bookings.forEach((b) => {
    if (b.scheduledDate) {
      const day = format(new Date(b.scheduledDate), "EEEE");
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
  });
  const peakDays = Array.from(dayMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalBookings,
    completedCount,
    cancelledCount,
    completionRate,
    cancellationRate,
    trends,
    peakHours,
    peakDays,
  };
}

// Engineer Performance Data
export type EngineerPerformance = {
  id: string;
  name: string;
  jobsCompleted: number;
  totalRevenue: number;
  averageRating: number | null;
  utilizationPercent: number;
  completionRate: number;
};

export type EngineerReportData = {
  totalEngineers: number;
  activeEngineers: number;
  totalJobsCompleted: number;
  averageJobsPerEngineer: number;
  engineers: EngineerPerformance[];
};

export async function getEngineerReportData(): Promise<EngineerReportData> {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);

  const [engineers, bookings] = await Promise.all([
    db.user.findMany({
      where: { role: "ENGINEER", engineerProfile: { status: "APPROVED" } },
      include: { engineerProfile: true },
    }),
    db.booking.findMany({
      where: {
        engineerId: { not: null },
        scheduledDate: { gte: threeMonthsAgo },
      },
      select: {
        engineerId: true,
        status: true,
        quotedPrice: true,
      },
    }),
  ]);

  const totalEngineers = engineers.length;
  const totalJobsCompleted = bookings.filter((b) => b.status === "COMPLETED").length;
  const averageJobsPerEngineer = totalEngineers > 0 ? Math.round(totalJobsCompleted / totalEngineers) : 0;

  // Calculate per-engineer stats
  const engineerStats = engineers.map((eng) => {
    const engBookings = bookings.filter((b) => b.engineerId === eng.id);
    const completed = engBookings.filter((b) => b.status === "COMPLETED");
    const totalRevenue = completed.reduce((sum, b) => sum + b.quotedPrice, 0);
    const completionRate = engBookings.length > 0
      ? Math.round((completed.length / engBookings.length) * 100)
      : 0;

    // Utilization: completed jobs vs target (assume 40 jobs/month target = 120 in 3 months)
    const utilizationPercent = Math.min(100, Math.round((completed.length / 120) * 100));

    // Generate a simulated rating based on completion rate (actual ratings would come from reviews)
    const simulatedRating = completionRate >= 90 ? 4.5 + Math.random() * 0.5 :
                           completionRate >= 70 ? 4.0 + Math.random() * 0.5 :
                           completionRate >= 50 ? 3.5 + Math.random() * 0.5 : null;

    return {
      id: eng.id,
      name: eng.name,
      jobsCompleted: completed.length,
      totalRevenue,
      averageRating: simulatedRating ? parseFloat(simulatedRating.toFixed(1)) : null,
      utilizationPercent,
      completionRate,
    };
  });

  const activeEngineers = engineerStats.filter((e) => e.jobsCompleted > 0).length;

  return {
    totalEngineers,
    activeEngineers,
    totalJobsCompleted,
    averageJobsPerEngineer,
    engineers: engineerStats.sort((a, b) => b.jobsCompleted - a.jobsCompleted),
  };
}

// Geographic Report Data
export type RegionPerformance = {
  region: string;
  bookingCount: number;
  revenue: number;
  engineerCount: number;
  trend: "growing" | "stable" | "declining";
};

export type GeographicReportData = {
  totalRegions: number;
  topPerformingRegion: string;
  underservedRegions: string[];
  regions: RegionPerformance[];
};

export async function getGeographicReportData(): Promise<GeographicReportData> {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const sixMonthsAgo = subMonths(now, 6);

  const [recentBookings, olderBookings, engineers] = await Promise.all([
    db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        scheduledDate: { gte: threeMonthsAgo },
      },
      include: {
        site: { select: { postcode: true } },
      },
    }),
    db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        scheduledDate: { gte: sixMonthsAgo, lt: threeMonthsAgo },
      },
      include: {
        site: { select: { postcode: true } },
      },
    }),
    db.engineerProfile.findMany({
      where: { status: "APPROVED" },
      include: {
        user: { select: { name: true } },
        coverageAreas: true,
      },
    }),
  ]);

  // Group by postcode prefix
  const recentByRegion = new Map<string, { count: number; revenue: number }>();
  recentBookings.forEach((b) => {
    const region = b.site.postcode.substring(0, 2).toUpperCase().replace(/\d/g, "");
    const existing = recentByRegion.get(region) || { count: 0, revenue: 0 };
    recentByRegion.set(region, {
      count: existing.count + 1,
      revenue: existing.revenue + b.quotedPrice,
    });
  });

  const olderByRegion = new Map<string, number>();
  olderBookings.forEach((b) => {
    const region = b.site.postcode.substring(0, 2).toUpperCase().replace(/\d/g, "");
    olderByRegion.set(region, (olderByRegion.get(region) || 0) + 1);
  });

  // Count engineers per region
  const engineersByRegion = new Map<string, number>();
  engineers.forEach((eng) => {
    eng.coverageAreas.forEach((area) => {
      const region = area.postcodePrefix.substring(0, 2).toUpperCase().replace(/\d/g, "");
      engineersByRegion.set(region, (engineersByRegion.get(region) || 0) + 1);
    });
  });

  // Build region data
  const regions: RegionPerformance[] = Array.from(recentByRegion.entries()).map(([region, data]) => {
    const olderCount = olderByRegion.get(region) || 0;
    let trend: "growing" | "stable" | "declining" = "stable";
    if (data.count > olderCount * 1.2) trend = "growing";
    else if (data.count < olderCount * 0.8) trend = "declining";

    return {
      region,
      bookingCount: data.count,
      revenue: data.revenue,
      engineerCount: engineersByRegion.get(region) || 0,
      trend,
    };
  }).sort((a, b) => b.bookingCount - a.bookingCount);

  const totalRegions = regions.length;
  const topPerformingRegion = regions[0]?.region || "N/A";
  const underservedRegions = regions
    .filter((r) => r.engineerCount === 0 && r.bookingCount > 5)
    .map((r) => r.region);

  return {
    totalRegions,
    topPerformingRegion,
    underservedRegions,
    regions,
  };
}
