"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { generateCompletionCertificate } from "./certificates";
import { notifyCustomerBookingUpdate } from "./notifications";

type StatusTransitionResult = {
  success: boolean;
  error?: string;
  newStatus?: BookingStatus;
};

// Valid status transitions for engineers
const ENGINEER_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [],
  CONFIRMED: ["EN_ROUTE", "DECLINED"],
  EN_ROUTE: ["ON_SITE"],
  ON_SITE: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "REQUIRES_REVISIT"],
  COMPLETED: [],
  CANCELLED: [],
  DECLINED: [],
  REQUIRES_REVISIT: [],
};

// Valid status transitions for admins (can do more)
const ADMIN_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["EN_ROUTE", "PENDING", "CANCELLED", "DECLINED"],
  EN_ROUTE: ["ON_SITE", "CONFIRMED"],
  ON_SITE: ["IN_PROGRESS", "EN_ROUTE"],
  IN_PROGRESS: ["COMPLETED", "REQUIRES_REVISIT", "ON_SITE"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["PENDING"],
  DECLINED: ["PENDING"],
  REQUIRES_REVISIT: ["CONFIRMED"],
};

/**
 * Log a status change
 */
async function logStatusChange(
  bookingId: string,
  fromStatus: BookingStatus | null,
  toStatus: BookingStatus,
  changedBy: string,
  reason?: string
) {
  await db.bookingStatusLog.create({
    data: {
      bookingId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
    },
  });
}

/**
 * Accept a job assignment (moves from CONFIRMED to EN_ROUTE when ready)
 */
export async function acceptJob(
  bookingId: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "CONFIRMED") {
      return { success: false, error: "Job must be in CONFIRMED status to accept" };
    }

    // Mark as accepted but don't change status yet - they need to start traveling
    await db.booking.update({
      where: { id: bookingId },
      data: { acceptedAt: new Date() },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");

    return { success: true, newStatus: "CONFIRMED" };
  } catch (error) {
    console.error("Accept job error:", error);
    return { success: false, error: "Failed to accept job" };
  }
}

/**
 * Decline a job assignment
 */
export async function declineJob(
  bookingId: string,
  reason: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "CONFIRMED") {
      return { success: false, error: "Can only decline CONFIRMED jobs" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
        declinedReason: reason,
        engineerId: null, // Unassign engineer
      },
    });

    await logStatusChange(bookingId, "CONFIRMED", "DECLINED", user.id, reason);

    notifyCustomerBookingUpdate(bookingId, "DELAYED").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");
    revalidatePath("/admin/bookings");

    return { success: true, newStatus: "DECLINED" };
  } catch (error) {
    console.error("Decline job error:", error);
    return { success: false, error: "Failed to decline job" };
  }
}

/**
 * Mark as en route to job site
 */
export async function startEnRoute(
  bookingId: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "CONFIRMED") {
      return { success: false, error: "Job must be CONFIRMED to start en route" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "EN_ROUTE",
        enRouteAt: new Date(),
        acceptedAt: booking.status === "CONFIRMED" ? new Date() : undefined,
      },
    });

    await logStatusChange(bookingId, "CONFIRMED", "EN_ROUTE", user.id);

    notifyCustomerBookingUpdate(bookingId, "EN_ROUTE").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");

    return { success: true, newStatus: "EN_ROUTE" };
  } catch (error) {
    console.error("Start en route error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Mark as arrived on site
 */
export async function arriveOnSite(
  bookingId: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "EN_ROUTE") {
      return { success: false, error: "Must be EN_ROUTE to arrive on site" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "ON_SITE",
        arrivedAt: new Date(),
      },
    });

    await logStatusChange(bookingId, "EN_ROUTE", "ON_SITE", user.id);

    notifyCustomerBookingUpdate(bookingId, "ARRIVED").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");

    return { success: true, newStatus: "ON_SITE" };
  } catch (error) {
    console.error("Arrive on site error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Start work on the job
 */
export async function startWork(
  bookingId: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "ON_SITE") {
      return { success: false, error: "Must be ON_SITE to start work" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    await logStatusChange(bookingId, "ON_SITE", "IN_PROGRESS", user.id);

    notifyCustomerBookingUpdate(bookingId, "STARTED").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");

    return { success: true, newStatus: "IN_PROGRESS" };
  } catch (error) {
    console.error("Start work error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Complete the job
 */
export async function completeJob(
  bookingId: string,
  data?: {
    notes?: string;
  }
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        engineerId: true,
        customerSignatureUrl: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be IN_PROGRESS to complete" };
    }

    // Check for customer signature (required for completion)
    if (!booking.customerSignatureUrl) {
      return { success: false, error: "Customer signature required to complete job" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        engineerNotes: data?.notes || undefined,
      },
    });

    await logStatusChange(bookingId, "IN_PROGRESS", "COMPLETED", user.id);

    notifyCustomerBookingUpdate(bookingId, "COMPLETED").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    // Generate completion certificate in the background
    generateCompletionCertificate(bookingId).catch((err) => {
      console.error("Failed to generate certificate:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");
    revalidatePath("/admin/bookings");

    return { success: true, newStatus: "COMPLETED" };
  } catch (error) {
    console.error("Complete job error:", error);
    return { success: false, error: "Failed to complete job" };
  }
}

/**
 * Mark job as requiring revisit
 */
export async function markRequiresRevisit(
  bookingId: string,
  reason: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    if (booking.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be IN_PROGRESS" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "REQUIRES_REVISIT",
        revisitReason: reason,
      },
    });

    await logStatusChange(bookingId, "IN_PROGRESS", "REQUIRES_REVISIT", user.id, reason);

    notifyCustomerBookingUpdate(bookingId, "REQUIRES_REVISIT").catch((err) => {
      console.error("Failed to notify customer:", err);
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/jobs");
    revalidatePath("/admin/bookings");

    return { success: true, newStatus: "REQUIRES_REVISIT" };
  } catch (error) {
    console.error("Mark requires revisit error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Get status history for a booking
 */
export async function getBookingStatusHistory(bookingId: string) {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, engineerId: true },
    });

    if (!booking) return [];

    // Check access
    const hasAccess =
      user.role === "ADMIN" ||
      user.id === booking.customerId ||
      user.id === booking.engineerId;

    if (!hasAccess) return [];

    return db.bookingStatusLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Get status history error:", error);
    return [];
  }
}

/**
 * Admin: Update booking status with more flexibility
 */
export async function adminUpdateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  reason?: string
): Promise<StatusTransitionResult> {
  try {
    const user = await requireUser();

    if (user.role !== "ADMIN") {
      return { success: false, error: "Admin access required" };
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    const allowedTransitions = ADMIN_TRANSITIONS[booking.status];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${booking.status} to ${newStatus}`,
      };
    }

    // Build update data based on new status
    const updateData: Record<string, unknown> = { status: newStatus };

    switch (newStatus) {
      case "CONFIRMED":
        updateData.confirmedAt = new Date();
        break;
      case "EN_ROUTE":
        updateData.enRouteAt = new Date();
        break;
      case "ON_SITE":
        updateData.arrivedAt = new Date();
        break;
      case "IN_PROGRESS":
        updateData.startedAt = new Date();
        break;
      case "COMPLETED":
        updateData.completedAt = new Date();
        break;
      case "CANCELLED":
        break;
    }

    await db.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    await logStatusChange(bookingId, booking.status, newStatus, user.id, reason);

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);

    return { success: true, newStatus };
  } catch (error) {
    console.error("Admin update status error:", error);
    return { success: false, error: "Failed to update status" };
  }
}
