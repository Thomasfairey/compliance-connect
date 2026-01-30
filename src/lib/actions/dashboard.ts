"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export type AdminDashboardData = {
  stats: {
    totalUsers: number;
    totalEngineers: number;
    totalBookings: number;
    pendingBookings: number;
    completedBookings: number;
    revenue: number;
  };
  recentBookings: {
    id: string;
    status: string;
    scheduledDate: Date;
    quotedPrice: number;
    engineerId: string | null;
    service: { name: string };
    customer: { name: string };
    site: { name: string };
  }[];
  unassignedBookings: {
    id: string;
    status: string;
    scheduledDate: Date;
    quotedPrice: number;
    engineerId: string | null;
    service: { name: string };
    customer: { name: string };
    site: { name: string };
  }[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    await requireRole(["ADMIN"]);

    const [
      totalUsers,
      totalEngineers,
      totalBookings,
      pendingBookings,
      completedBookings,
      revenueAgg,
      bookings,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "ENGINEER" } }),
      db.booking.count(),
      db.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
      db.booking.count({ where: { status: "COMPLETED" } }),
      db.booking.aggregate({
        where: { status: "COMPLETED" },
        _sum: { quotedPrice: true },
      }),
      db.booking.findMany({
        include: {
          customer: true,
          site: true,
          service: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalEngineers,
        totalBookings,
        pendingBookings,
        completedBookings,
        revenue: revenueAgg._sum.quotedPrice || 0,
      },
      recentBookings: bookings.slice(0, 5),
      unassignedBookings: bookings.filter(
        (b) => b.status === "PENDING" && !b.engineerId
      ),
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return {
      stats: {
        totalUsers: 0,
        totalEngineers: 0,
        totalBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        revenue: 0,
      },
      recentBookings: [],
      unassignedBookings: [],
    };
  }
}

export type EngineerDashboardData = {
  stats: {
    assignedJobs: number;
    inProgressJobs: number;
    completedToday: number;
    completedThisWeek: number;
  };
  todaysJobs: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    service: { name: string };
    site: { name: string; postcode: string };
  }[];
  availableJobs: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    service: { name: string };
    site: { name: string; postcode: string };
  }[];
};

export async function getEngineerDashboardData(): Promise<EngineerDashboardData> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [assignedJobs, inProgressJobs, completedToday, completedThisWeek, todaysJobsData, availableJobsData] =
      await Promise.all([
        db.booking.count({
          where: {
            engineerId: user.id,
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
        }),
        db.booking.count({
          where: { engineerId: user.id, status: "IN_PROGRESS" },
        }),
        db.booking.count({
          where: {
            engineerId: user.id,
            status: "COMPLETED",
            completedAt: { gte: today },
          },
        }),
        db.booking.count({
          where: {
            engineerId: user.id,
            status: "COMPLETED",
            completedAt: { gte: weekStart },
          },
        }),
        db.booking.findMany({
          where: {
            engineerId: user.id,
            scheduledDate: { gte: today, lt: tomorrow },
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
          include: {
            service: true,
            site: true,
          },
          orderBy: { scheduledDate: "asc" },
        }),
        db.booking.findMany({
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            engineerId: null,
          },
          include: {
            service: true,
            site: true,
          },
          orderBy: { scheduledDate: "asc" },
          take: 5,
        }),
      ]);

    return {
      stats: {
        assignedJobs,
        inProgressJobs,
        completedToday,
        completedThisWeek,
      },
      todaysJobs: todaysJobsData,
      availableJobs: availableJobsData,
    };
  } catch (error) {
    console.error("Error fetching engineer dashboard data:", error);
    return {
      stats: {
        assignedJobs: 0,
        inProgressJobs: 0,
        completedToday: 0,
        completedThisWeek: 0,
      },
      todaysJobs: [],
      availableJobs: [],
    };
  }
}

export type EngineerJobsData = {
  myJobs: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    estimatedQty: number;
    service: { name: string; unitName: string };
    site: { name: string; address: string; postcode: string };
  }[];
  availableJobs: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    estimatedQty: number;
    service: { name: string; unitName: string };
    site: { name: string; address: string; postcode: string };
  }[];
};

export async function getEngineerJobsData(): Promise<EngineerJobsData> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const [myJobsData, availableJobsData] = await Promise.all([
      db.booking.findMany({
        where: { engineerId: user.id },
        include: {
          service: true,
          site: true,
        },
        orderBy: { scheduledDate: "asc" },
      }),
      db.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          engineerId: null,
        },
        include: {
          service: true,
          site: true,
        },
        orderBy: { scheduledDate: "asc" },
      }),
    ]);

    return {
      myJobs: myJobsData,
      availableJobs: availableJobsData,
    };
  } catch (error) {
    console.error("Error fetching engineer jobs:", error);
    return {
      myJobs: [],
      availableJobs: [],
    };
  }
}

export type CustomerDashboardData = {
  stats: {
    totalBookings: number;
    pendingBookings: number;
    completedBookings: number;
    totalSites: number;
  };
  recentBookings: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    quotedPrice: number;
    site: { name: string };
    service: { name: string };
  }[];
  upcomingBookings: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    quotedPrice: number;
    site: { name: string };
    service: { name: string };
  }[];
};

export async function getCustomerDashboardData(): Promise<CustomerDashboardData> {
  try {
    const user = await requireRole(["CUSTOMER", "ADMIN"]);

    const [totalBookings, pendingBookings, completedBookings, totalSites, bookings] =
      await Promise.all([
        db.booking.count({ where: { customerId: user.id } }),
        db.booking.count({
          where: { customerId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
        }),
        db.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
        db.site.count({ where: { userId: user.id } }),
        db.booking.findMany({
          where: { customerId: user.id },
          include: {
            site: true,
            service: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const recentBookings = bookings.slice(0, 5);
    const upcomingBookings = bookings.filter(
      (b) =>
        (b.status === "PENDING" || b.status === "CONFIRMED") &&
        new Date(b.scheduledDate) >= new Date()
    );

    return {
      stats: { totalBookings, pendingBookings, completedBookings, totalSites },
      recentBookings,
      upcomingBookings,
    };
  } catch (error) {
    console.error("Error fetching customer dashboard data:", error);
    return {
      stats: { totalBookings: 0, pendingBookings: 0, completedBookings: 0, totalSites: 0 },
      recentBookings: [],
      upcomingBookings: [],
    };
  }
}
