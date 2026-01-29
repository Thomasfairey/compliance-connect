"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { userProfileSchema } from "@/lib/validations";
import type { User, Role } from "@prisma/client";
import type { DashboardStats, EngineerStats } from "@/types";

export async function updateUserProfile(input: {
  name: string;
  companyName?: string;
  phone?: string;
}): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const user = await requireUser();
    const validated = userProfileSchema.parse(input);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: validated.name,
        companyName: validated.companyName || null,
        phone: validated.phone || null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const user = await requireUser();

    const [totalBookings, pendingBookings, completedBookings, totalSites] =
      await Promise.all([
        db.booking.count({ where: { customerId: user.id } }),
        db.booking.count({
          where: { customerId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
        }),
        db.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
        db.site.count({ where: { userId: user.id } }),
      ]);

    return {
      totalBookings,
      pendingBookings,
      completedBookings,
      totalSites,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalBookings: 0,
      pendingBookings: 0,
      completedBookings: 0,
      totalSites: 0,
    };
  }
}

export async function getEngineerStats(): Promise<EngineerStats> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [assignedJobs, inProgressJobs, completedToday, completedThisWeek] =
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
      ]);

    return {
      assignedJobs,
      inProgressJobs,
      completedToday,
      completedThisWeek,
    };
  } catch (error) {
    console.error("Error getting engineer stats:", error);
    return {
      assignedJobs: 0,
      inProgressJobs: 0,
      completedToday: 0,
      completedThisWeek: 0,
    };
  }
}

// Admin actions
export async function getAllEngineers(): Promise<User[]> {
  await requireRole(["ADMIN"]);

  const engineers = await db.user.findMany({
    where: { role: "ENGINEER" },
    orderBy: { name: "asc" },
  });

  return engineers;
}

export async function getAllUsers(): Promise<User[]> {
  await requireRole(["ADMIN"]);

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export async function updateUserRole(
  userId: string,
  role: Role
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    await db.user.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath("/admin/engineers");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update user role",
    };
  }
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalEngineers: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  revenue: number;
}> {
  try {
    await requireRole(["ADMIN"]);

    const [
      totalUsers,
      totalEngineers,
      totalBookings,
      pendingBookings,
      completedBookings,
      revenueAgg,
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
    ]);

    return {
      totalUsers,
      totalEngineers,
      totalBookings,
      pendingBookings,
      completedBookings,
      revenue: revenueAgg._sum.quotedPrice || 0,
    };
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return {
      totalUsers: 0,
      totalEngineers: 0,
      totalBookings: 0,
      pendingBookings: 0,
      completedBookings: 0,
      revenue: 0,
    };
  }
}
