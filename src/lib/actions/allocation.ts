"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type AllocationCandidate = {
  engineerId: string;
  engineerName: string;
  score: number;
  reasons: string[];
  travelTime?: number;
  distanceKm?: number;
  hasCompetency: boolean;
  isAvailable: boolean;
  existingJobsOnDay: number;
};

export type AllocationResult = {
  success: boolean;
  engineerId?: string;
  engineerName?: string;
  score?: number;
  reasons?: string[];
  candidates?: AllocationCandidate[];
  error?: string;
};

// Greedy allocation algorithm
export async function findBestEngineer(
  bookingId: string
): Promise<AllocationResult> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        site: true,
        service: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Get all approved engineers
    const engineers = await db.user.findMany({
      where: {
        role: "ENGINEER",
        engineerProfile: {
          status: "APPROVED",
        },
      },
      include: {
        engineerProfile: {
          include: {
            competencies: true,
            coverageAreas: true,
            availability: {
              where: {
                date: booking.scheduledDate,
              },
            },
          },
        },
      },
    });

    const candidates: AllocationCandidate[] = [];
    const sitePostcodePrefix = booking.site.postcode.split(" ")[0].replace(/[0-9]/g, "");

    for (const engineer of engineers) {
      if (!engineer.engineerProfile) continue;

      const profile = engineer.engineerProfile;
      let score = 0;
      const reasons: string[] = [];

      // 1. Check competency for the service (required)
      const hasCompetency = profile.competencies.some(
        (c) => c.serviceId === booking.serviceId
      );
      if (!hasCompetency) {
        candidates.push({
          engineerId: engineer.id,
          engineerName: engineer.name,
          score: 0,
          reasons: ["No competency for this service"],
          hasCompetency: false,
          isAvailable: false,
          existingJobsOnDay: 0,
        });
        continue;
      }
      score += 30;
      reasons.push("Has required competency");

      // 2. Check coverage area
      const coversArea = profile.coverageAreas.some((area) => {
        const areaPrefix = area.postcodePrefix.replace(/[0-9]/g, "");
        return sitePostcodePrefix.startsWith(areaPrefix) ||
               areaPrefix.startsWith(sitePostcodePrefix);
      });
      if (coversArea) {
        score += 25;
        reasons.push("Covers site postcode area");
      }

      // 3. Check availability
      const slot = booking.slot;
      const availabilityRecord = profile.availability.find(
        (a) => a.slot === slot || a.slot === "FULL_DAY"
      );
      const isAvailable = availabilityRecord?.isAvailable ?? true;

      if (!isAvailable) {
        candidates.push({
          engineerId: engineer.id,
          engineerName: engineer.name,
          score: 0,
          reasons: ["Not available for this slot"],
          hasCompetency: true,
          isAvailable: false,
          existingJobsOnDay: 0,
        });
        continue;
      }
      score += 20;
      reasons.push("Available for the time slot");

      // 4. Check existing jobs on the same day (for route optimization)
      const existingJobsOnDay = await db.booking.count({
        where: {
          engineerId: engineer.id,
          scheduledDate: booking.scheduledDate,
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      });

      if (existingJobsOnDay > 0) {
        // Check if any existing jobs are in the same area
        const existingJobsInArea = await db.booking.findMany({
          where: {
            engineerId: engineer.id,
            scheduledDate: booking.scheduledDate,
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
          include: { site: true },
        });

        const sameAreaJobs = existingJobsInArea.filter((job) => {
          const jobPrefix = job.site.postcode.split(" ")[0].replace(/[0-9]/g, "");
          return jobPrefix === sitePostcodePrefix;
        });

        if (sameAreaJobs.length > 0) {
          score += 15; // Bonus for route efficiency
          reasons.push(`Has ${sameAreaJobs.length} other job(s) in same area - route efficient`);
        } else if (existingJobsOnDay <= 2) {
          score += 5;
          reasons.push(`Has ${existingJobsOnDay} other job(s) on this day`);
        }
      } else {
        score += 10;
        reasons.push("Day is free - flexible scheduling");
      }

      // 5. Experience bonus
      const competency = profile.competencies.find(
        (c) => c.serviceId === booking.serviceId
      );
      if (competency && competency.experienceYears >= 5) {
        score += 5;
        reasons.push(`${competency.experienceYears} years experience`);
      }

      candidates.push({
        engineerId: engineer.id,
        engineerName: engineer.name,
        score,
        reasons,
        hasCompetency: true,
        isAvailable: true,
        existingJobsOnDay,
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    const bestCandidate = candidates.find((c) => c.score > 0);

    if (!bestCandidate) {
      return {
        success: false,
        error: "No suitable engineer found",
        candidates,
      };
    }

    return {
      success: true,
      engineerId: bestCandidate.engineerId,
      engineerName: bestCandidate.engineerName,
      score: bestCandidate.score,
      reasons: bestCandidate.reasons,
      candidates,
    };
  } catch (error) {
    console.error("Error finding best engineer:", error);
    return { success: false, error: "Allocation failed" };
  }
}

export async function autoAllocateBooking(
  bookingId: string
): Promise<AllocationResult> {
  try {
    const result = await findBestEngineer(bookingId);

    if (!result.success || !result.engineerId) {
      return result;
    }

    // Assign the engineer
    await db.booking.update({
      where: { id: bookingId },
      data: {
        engineerId: result.engineerId,
        status: "CONFIRMED",
      },
    });

    // Log the allocation
    await db.allocationLog.create({
      data: {
        bookingId,
        action: "AUTO_ASSIGNED",
        toEngineerId: result.engineerId,
        reason: result.reasons?.join("; "),
        score: result.score,
        metadata: {
          candidates: result.candidates?.length,
          topScore: result.score,
        },
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/engineer/jobs");

    return result;
  } catch (error) {
    console.error("Error auto-allocating booking:", error);
    return { success: false, error: "Allocation failed" };
  }
}

export async function reallocateBooking(
  bookingId: string,
  newEngineerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    const oldEngineerId = booking.engineerId;

    await db.booking.update({
      where: { id: bookingId },
      data: {
        engineerId: newEngineerId,
        status: "CONFIRMED",
      },
    });

    // Log the reallocation
    await db.allocationLog.create({
      data: {
        bookingId,
        action: "REALLOCATED",
        fromEngineerId: oldEngineerId,
        toEngineerId: newEngineerId,
        reason,
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/engineer/jobs");

    return { success: true };
  } catch (error) {
    console.error("Error reallocating booking:", error);
    return { success: false, error: "Reallocation failed" };
  }
}

export async function getOptimizedRoute(
  engineerId: string,
  date: Date
): Promise<{
  success: boolean;
  bookings?: Array<{
    id: string;
    serviceName: string;
    siteName: string;
    postcode: string;
    slot: string;
    suggestedOrder: number;
  }>;
  error?: string;
}> {
  try {
    const bookings = await db.booking.findMany({
      where: {
        engineerId,
        scheduledDate: date,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
      include: {
        site: true,
        service: true,
      },
      orderBy: { slot: "asc" },
    });

    if (bookings.length === 0) {
      return { success: true, bookings: [] };
    }

    // Simple greedy route optimization by grouping postcodes
    // (In production, would use actual TSP algorithm with distances)
    const grouped = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      const prefix = booking.site.postcode.split(" ")[0];
      const existing = grouped.get(prefix) || [];
      existing.push(booking);
      grouped.set(prefix, existing);
    }

    const optimized: typeof bookings[0][] = [];
    for (const [, group] of grouped) {
      optimized.push(...group.sort((a, b) => a.slot.localeCompare(b.slot)));
    }

    return {
      success: true,
      bookings: optimized.map((b, index) => ({
        id: b.id,
        serviceName: b.service.name,
        siteName: b.site.name,
        postcode: b.site.postcode,
        slot: b.slot,
        suggestedOrder: index + 1,
      })),
    };
  } catch (error) {
    console.error("Error optimizing route:", error);
    return { success: false, error: "Route optimization failed" };
  }
}

export async function getAllocationLogs(
  bookingId: string
): Promise<Array<{
  id: string;
  action: string;
  fromEngineerId: string | null;
  toEngineerId: string | null;
  reason: string | null;
  score: number | null;
  createdAt: Date;
}>> {
  try {
    const logs = await db.allocationLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });

    return logs;
  } catch (error) {
    console.error("Error fetching allocation logs:", error);
    return [];
  }
}
