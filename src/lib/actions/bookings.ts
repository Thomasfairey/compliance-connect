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

// Discount tiers based on proximity and existing bookings
const DISCOUNT_SAME_LOCATION = 50; // 50% - Same location on same day
const DISCOUNT_SAME_POSTCODE = 25; // 25% - Same postcode area on same day
const DISCOUNT_ADJACENT_DAY = 10; // 10% - Adjacent day with nearby booking

// Maximum drive time for "nearby" consideration (in km)
const MAX_NEARBY_KM = 10;

function extractPostcodePrefix(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();
  if (cleaned.length > 3) return cleaned.slice(0, -3);
  return cleaned;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// OPTIMIZED: Get discounts for a range of dates with a single batch query
export async function getDateRangeDiscounts(
  serviceId: string,
  siteId: string,
  startDate: Date,
  endDate: Date,
  estimatedQty: number
): Promise<{ date: string; discountPercent: number; discountReason?: string }[]> {
  // Fetch service and site in parallel
  const [service, site] = await Promise.all([
    db.service.findUnique({ where: { id: serviceId } }),
    db.site.findUnique({ where: { id: siteId } }),
  ]);

  if (!service || !site) return [];

  // Extend the date range by 1 day on each side for adjacent-day discount checks
  const queryStart = new Date(startDate);
  queryStart.setDate(queryStart.getDate() - 1);
  queryStart.setHours(0, 0, 0, 0);

  const queryEnd = new Date(endDate);
  queryEnd.setDate(queryEnd.getDate() + 1);
  queryEnd.setHours(23, 59, 59, 999);

  // Single query to get all bookings in the extended date range
  const allBookings = await db.booking.findMany({
    where: {
      scheduledDate: { gte: queryStart, lte: queryEnd },
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
    },
    include: { site: true },
  });

  // Group bookings by date for fast lookup
  const bookingsByDate = new Map<string, typeof allBookings>();
  for (const booking of allBookings) {
    const dateKey = booking.scheduledDate.toISOString().split("T")[0];
    if (!bookingsByDate.has(dateKey)) {
      bookingsByDate.set(dateKey, []);
    }
    bookingsByDate.get(dateKey)!.push(booking);
  }

  const sitePostcodePrefix = extractPostcodePrefix(site.postcode);
  const results: { date: string; discountPercent: number; discountReason?: string }[] = [];

  // Process each date in the range
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  while (currentDate <= endDateTime) {
    const dateKey = currentDate.toISOString().split("T")[0];
    const sameDayBookings = bookingsByDate.get(dateKey) || [];

    // Check for same location on same day (50% discount)
    if (sameDayBookings.some(b => b.siteId === site.id)) {
      results.push({
        date: dateKey,
        discountPercent: DISCOUNT_SAME_LOCATION,
        discountReason: "Same location discount - another service booked here today",
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check for same postcode on same day (25% discount)
    if (sameDayBookings.some(b => extractPostcodePrefix(b.site.postcode) === sitePostcodePrefix)) {
      results.push({
        date: dateKey,
        discountPercent: DISCOUNT_SAME_POSTCODE,
        discountReason: `Area discount - booking in ${sitePostcodePrefix} area today`,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check for nearby bookings on same day (25% discount)
    if (site.latitude && site.longitude) {
      const nearbyOnSameDay = sameDayBookings.some(b =>
        b.site.latitude && b.site.longitude &&
        calculateDistance(site.latitude!, site.longitude!, b.site.latitude, b.site.longitude) <= MAX_NEARBY_KM
      );
      if (nearbyOnSameDay) {
        results.push({
          date: dateKey,
          discountPercent: DISCOUNT_SAME_POSTCODE,
          discountReason: "Proximity discount - nearby booking on same day",
        });
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }

    // Check adjacent days for discounts (10% discount)
    const dayBefore = new Date(currentDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(currentDate);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const beforeKey = dayBefore.toISOString().split("T")[0];
    const afterKey = dayAfter.toISOString().split("T")[0];

    const adjacentBookings = [
      ...(bookingsByDate.get(beforeKey) || []),
      ...(bookingsByDate.get(afterKey) || []),
    ];

    // Check for same postcode on adjacent days
    if (adjacentBookings.some(b => extractPostcodePrefix(b.site.postcode) === sitePostcodePrefix)) {
      results.push({
        date: dateKey,
        discountPercent: DISCOUNT_ADJACENT_DAY,
        discountReason: `Adjacent day discount - booking in ${sitePostcodePrefix} area nearby`,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check for nearby bookings on adjacent days
    if (site.latitude && site.longitude) {
      const nearbyOnAdjacent = adjacentBookings.some(b =>
        b.site.latitude && b.site.longitude &&
        calculateDistance(site.latitude!, site.longitude!, b.site.latitude, b.site.longitude) <= MAX_NEARBY_KM
      );
      if (nearbyOnAdjacent) {
        results.push({
          date: dateKey,
          discountPercent: DISCOUNT_ADJACENT_DAY,
          discountReason: "Adjacent day discount - nearby booking the day before/after",
        });
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }

    // No discount
    results.push({ date: dateKey, discountPercent: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

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

// Find the best available engineer for a booking
async function findAvailableEngineer(
  serviceId: string,
  sitePostcode: string,
  scheduledDate: Date,
  slot: string
): Promise<string | null> {
  // Extract postcode prefix (e.g., "SW1" from "SW1A 1AA")
  const postcodePrefix = sitePostcode.replace(/\s/g, "").toUpperCase().slice(0, -3);

  // Find engineers who:
  // 1. Have APPROVED status
  // 2. Have competency for this service
  // 3. Cover this postcode area
  const eligibleEngineers = await db.engineerProfile.findMany({
    where: {
      status: "APPROVED",
      competencies: {
        some: { serviceId },
      },
      coverageAreas: {
        some: {
          postcodePrefix: {
            in: [postcodePrefix, postcodePrefix.slice(0, 2), postcodePrefix.slice(0, 1)],
          },
        },
      },
    },
    include: {
      user: true,
      availability: {
        where: {
          date: scheduledDate,
          slot: slot === "AM" || slot === "PM" ? slot : undefined,
        },
      },
    },
  });

  if (eligibleEngineers.length === 0) {
    return null;
  }

  // Check which engineers are available (not already booked)
  const dateStart = new Date(scheduledDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(scheduledDate);
  dateEnd.setHours(23, 59, 59, 999);

  const existingBookings = await db.booking.findMany({
    where: {
      scheduledDate: { gte: dateStart, lte: dateEnd },
      slot,
      engineerId: { not: null },
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
    },
    select: { engineerId: true },
  });

  const bookedEngineerIds = new Set(existingBookings.map(b => b.engineerId));

  // Find first available engineer
  for (const engineer of eligibleEngineers) {
    // Skip if already booked
    if (bookedEngineerIds.has(engineer.userId)) {
      continue;
    }

    // Check if they have availability set (and it's true) or no availability set (assume available)
    const availabilityRecord = engineer.availability.find(a =>
      a.date.toDateString() === scheduledDate.toDateString()
    );

    if (!availabilityRecord || availabilityRecord.isAvailable) {
      return engineer.userId;
    }
  }

  return null;
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

    // Auto-assign an available engineer
    const assignedEngineerId = await findAvailableEngineer(
      validated.serviceId,
      site.postcode,
      validated.scheduledDate,
      validated.slot
    );

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
        // Auto-assign engineer and set status to CONFIRMED if engineer found
        engineerId: assignedEngineerId,
        status: assignedEngineerId ? "CONFIRMED" : "PENDING",
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
    if (assignedEngineerId) {
      revalidatePath("/engineer");
      revalidatePath("/engineer/jobs");
    }

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
