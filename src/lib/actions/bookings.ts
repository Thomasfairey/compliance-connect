"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { bookingSchema } from "@/lib/validations";
import { generateBookingReference } from "@/lib/utils";
import { calculateDynamicPrice, calculateDuration, getAvailableDiscount as getPricing } from "@/lib/pricing";
import type { BookingStatus } from "@prisma/client";
import type { BookingWithRelations, CreateBookingInput } from "@/types";

// Re-export getAvailableDiscount for client use
export { getPricing as getAvailableDiscount };

export async function getCustomerBookings(): Promise<BookingWithRelations[]> {
  const user = await requireUser();

  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    include: {
      customer: true,
      site: true,
      service: true,
      engineer: true,
      assets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
}

export async function getBookingById(
  id: string
): Promise<BookingWithRelations | null> {
  const user = await requireUser();

  // Admins can view any booking
  if (user.role === "ADMIN") {
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: true,
        assets: true,
      },
    });
    return booking;
  }

  // Non-admins can only view their own bookings (as customer or engineer)
  const booking = await db.booking.findFirst({
    where: {
      id,
      OR: [
        { customerId: user.id },
        { engineerId: user.id },
      ],
    },
    include: {
      customer: true,
      site: true,
      service: true,
      engineer: true,
      assets: true,
    },
  });

  return booking;
}

export async function createBooking(
  input: CreateBookingInput
): Promise<{ success: boolean; data?: BookingWithRelations; error?: string }> {
  try {
    const user = await requireUser();
    const validated = bookingSchema.parse(input);

    // Idempotency check - prevent duplicate bookings within 60 seconds
    const recentDuplicate = await db.booking.findFirst({
      where: {
        customerId: user.id,
        siteId: validated.siteId,
        serviceId: validated.serviceId,
        scheduledDate: validated.scheduledDate,
        slot: validated.slot,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last 60 seconds
        },
      },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: true,
        assets: true,
      },
    });

    if (recentDuplicate) {
      // Return the existing booking instead of creating a duplicate
      return { success: true, data: recentDuplicate };
    }

    // Verify site belongs to user
    const site = await db.site.findFirst({
      where: { id: validated.siteId, userId: user.id },
    });

    if (!site) {
      return { success: false, error: "Site not found" };
    }

    // Get service for pricing
    const service = await db.service.findUnique({
      where: { id: validated.serviceId },
    });

    if (!service) {
      return { success: false, error: "Service not found" };
    }

    // Calculate dynamic pricing (includes discounts based on proximity)
    const pricing = await calculateDynamicPrice(
      service,
      site,
      validated.scheduledDate,
      validated.estimatedQty
    );

    // Calculate estimated duration
    const duration = calculateDuration(service, validated.estimatedQty);

    const booking = await db.booking.create({
      data: {
        reference: generateBookingReference(),
        customerId: user.id,
        siteId: validated.siteId,
        serviceId: validated.serviceId,
        scheduledDate: validated.scheduledDate,
        slot: validated.slot,
        estimatedQty: validated.estimatedQty,
        quotedPrice: pricing.discountedPrice,
        originalPrice: pricing.originalPrice,
        discountPercent: pricing.discountPercent,
        estimatedDuration: duration.estimatedMinutes,
        notes: validated.notes,
      },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: true,
        assets: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/bookings");

    return { success: true, data: booking };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

export async function cancelBooking(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findFirst({
      where: { id, customerId: user.id },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return { success: false, error: "Cannot cancel this booking" };
    }

    await db.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

// Engineer actions
export async function getAvailableJobs(): Promise<BookingWithRelations[]> {
  await requireRole(["ENGINEER", "ADMIN"]);

  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      engineerId: null,
    },
    include: {
      customer: true,
      site: true,
      service: true,
      engineer: true,
      assets: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  return bookings;
}

export async function getEngineerJobs(): Promise<BookingWithRelations[]> {
  const user = await requireRole(["ENGINEER", "ADMIN"]);

  const bookings = await db.booking.findMany({
    where: { engineerId: user.id },
    include: {
      customer: true,
      site: true,
      service: true,
      engineer: true,
      assets: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  return bookings;
}

export async function assignJobToSelf(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    // Use atomic update with condition to prevent race conditions
    // Only updates if engineerId is null (unassigned)
    const result = await db.booking.updateMany({
      where: {
        id: bookingId,
        engineerId: null, // Only assign if not already assigned
      },
      data: {
        engineerId: user.id,
        status: "CONFIRMED",
      },
    });

    if (result.count === 0) {
      // Either booking doesn't exist or already assigned
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return { success: false, error: "Booking not found" };
      }

      return { success: false, error: "Job already assigned to another engineer" };
    }

    revalidatePath("/engineer");
    revalidatePath("/engineer/jobs");
    revalidatePath(`/engineer/jobs/${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error assigning job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign job",
    };
  }
}

export async function startJob(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const booking = await db.booking.findFirst({
      where: { id: bookingId, engineerId: user.id },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status !== "CONFIRMED") {
      return { success: false, error: "Cannot start this job" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    revalidatePath("/engineer");
    revalidatePath("/engineer/jobs");
    revalidatePath(`/engineer/jobs/${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error starting job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start job",
    };
  }
}

export async function completeJob(
  bookingId: string,
  data: { engineerNotes?: string; uploadedDocsUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const booking = await db.booking.findFirst({
      where: { id: bookingId, engineerId: user.id },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status !== "IN_PROGRESS") {
      return { success: false, error: "Cannot complete this job" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        engineerNotes: data.engineerNotes,
        uploadedDocsUrl: data.uploadedDocsUrl,
      },
    });

    revalidatePath("/engineer");
    revalidatePath("/engineer/jobs");
    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/dashboard");
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error completing job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete job",
    };
  }
}

// Admin actions
export async function getAllBookings(): Promise<BookingWithRelations[]> {
  await requireRole(["ADMIN"]);

  const bookings = await db.booking.findMany({
    include: {
      customer: true,
      site: true,
      service: true,
      engineer: true,
      assets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
}

export async function assignEngineerToBooking(
  bookingId: string,
  engineerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    const engineer = await db.user.findFirst({
      where: { id: engineerId, role: "ENGINEER" },
    });

    if (!engineer) {
      return { success: false, error: "Engineer not found" };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        engineerId,
        status: "CONFIRMED",
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error assigning engineer:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign engineer",
    };
  }
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "PENDING"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // No transitions from completed
  CANCELLED: ["PENDING"], // Can reopen a cancelled booking
};

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[booking.status];
    if (!allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `Cannot change status from ${booking.status} to ${status}`,
      };
    }

    // Update with appropriate timestamps
    const updateData: { status: BookingStatus; startedAt?: Date; completedAt?: Date } = { status };

    if (status === "IN_PROGRESS" && !booking.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === "COMPLETED" && !booking.completedAt) {
      updateData.completedAt = new Date();
    }

    await db.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update status",
    };
  }
}
