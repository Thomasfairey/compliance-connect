"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  lookupPostcode,
  lookupPostcodes,
  calculateDistance,
  estimateDrivingTimeMinutes,
  getPostcodeArea,
} from "@/lib/postcodes";

export type AllocationCandidate = {
  engineerId: string;
  engineerName: string;
  score: number;
  reasons: string[];
  travelTime?: number;
  distanceKm?: number;
  hasCompetency: boolean;
  hasValidQualification: boolean;
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

// Greedy allocation algorithm with distance-based scoring and qualification expiry check
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

    // Get all approved engineers with their qualifications
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
            qualifications: true,
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
    const sitePostcodeArea = getPostcodeArea(booking.site.postcode);

    // Lookup site coordinates
    const siteCoords = await lookupPostcode(booking.site.postcode);
    const hasSiteCoords = siteCoords.success && siteCoords.result;

    // Collect all engineer postcodes for bulk lookup
    const engineerPostcodes: string[] = [];
    for (const engineer of engineers) {
      if (engineer.engineerProfile?.coverageAreas) {
        for (const area of engineer.engineerProfile.coverageAreas) {
          if (area.centerLat && area.centerLng) continue; // Already has coords
          engineerPostcodes.push(area.postcodePrefix + "1 1AA"); // Approximate center
        }
      }
    }

    for (const engineer of engineers) {
      if (!engineer.engineerProfile) continue;

      const profile = engineer.engineerProfile;
      let score = 0;
      const reasons: string[] = [];
      let distanceKm: number | undefined;
      let travelTime: number | undefined;

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
          hasValidQualification: false,
          isAvailable: false,
          existingJobsOnDay: 0,
        });
        continue;
      }
      score += 30;
      reasons.push("Has required competency");

      // 2. Check qualification expiry (CRITICAL - must have valid cert on job date)
      const relevantQualifications = profile.qualifications.filter((q) => {
        // Check if qualification is relevant to the service
        // Common mappings: PAT Testing needs PAT cert, Electrical needs 18th Edition, etc.
        const serviceName = booking.service.name.toLowerCase();
        const qualName = q.name.toLowerCase();

        if (serviceName.includes("pat")) {
          return qualName.includes("pat") || qualName.includes("portable appliance");
        }
        if (serviceName.includes("electric") || serviceName.includes("eicr")) {
          return qualName.includes("18th") || qualName.includes("2391") || qualName.includes("electrical");
        }
        if (serviceName.includes("fire")) {
          return qualName.includes("fire") || qualName.includes("safety");
        }
        // Default: any qualification counts
        return true;
      });

      const hasValidQualification = relevantQualifications.some((q) => {
        if (!q.expiryDate) return true; // No expiry = always valid
        return new Date(q.expiryDate) >= new Date(booking.scheduledDate);
      });

      if (!hasValidQualification && relevantQualifications.length > 0) {
        candidates.push({
          engineerId: engineer.id,
          engineerName: engineer.name,
          score: 0,
          reasons: ["Qualification expired before job date"],
          hasCompetency: true,
          hasValidQualification: false,
          isAvailable: false,
          existingJobsOnDay: 0,
        });
        continue;
      }

      if (hasValidQualification) {
        score += 10;
        reasons.push("Valid qualification for job date");
      }

      // 3. Calculate proximity score using real distance
      let coversArea = false;
      let closestDistance = Infinity;

      for (const area of profile.coverageAreas) {
        const areaPrefix = getPostcodeArea(area.postcodePrefix);

        // Check if postcode area matches
        if (sitePostcodeArea.startsWith(areaPrefix) || areaPrefix.startsWith(sitePostcodeArea)) {
          coversArea = true;
        }

        // Calculate actual distance if we have coordinates
        if (hasSiteCoords && siteCoords.result) {
          let areaLat = area.centerLat;
          let areaLng = area.centerLng;

          // If no stored coords, try to get approximate center
          if (!areaLat || !areaLng) {
            const areaLookup = await lookupPostcode(area.postcodePrefix + "1 1AA");
            if (areaLookup.success && areaLookup.result) {
              areaLat = areaLookup.result.latitude;
              areaLng = areaLookup.result.longitude;
            }
          }

          if (areaLat && areaLng) {
            const distance = calculateDistance(
              siteCoords.result.latitude,
              siteCoords.result.longitude,
              areaLat,
              areaLng
            );
            if (distance < closestDistance) {
              closestDistance = distance;
            }
          }
        }
      }

      // Apply proximity scoring
      if (closestDistance !== Infinity) {
        distanceKm = Math.round(closestDistance * 10) / 10;
        travelTime = estimateDrivingTimeMinutes(closestDistance);

        if (closestDistance <= 5) {
          score += 30; // Very close
          reasons.push(`Only ${distanceKm}km away - very close`);
        } else if (closestDistance <= 15) {
          score += 25; // Close
          reasons.push(`${distanceKm}km away - close`);
        } else if (closestDistance <= 30) {
          score += 15; // Moderate distance
          reasons.push(`${distanceKm}km away - moderate`);
        } else if (closestDistance <= 50) {
          score += 5; // Far but within range
          reasons.push(`${distanceKm}km away - within range`);
        } else {
          reasons.push(`${distanceKm}km away - quite far`);
        }
      } else if (coversArea) {
        score += 20;
        reasons.push("Covers site postcode area");
      }

      // 4. Check availability
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
          hasValidQualification,
          isAvailable: false,
          existingJobsOnDay: 0,
          distanceKm,
          travelTime,
        });
        continue;
      }
      score += 15;
      reasons.push("Available for the time slot");

      // 5. Check existing jobs on the same day (cluster awareness)
      const existingJobsOnDay = await db.booking.count({
        where: {
          engineerId: engineer.id,
          scheduledDate: booking.scheduledDate,
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      });

      if (existingJobsOnDay > 0) {
        // Check distance to existing jobs
        const existingJobs = await db.booking.findMany({
          where: {
            engineerId: engineer.id,
            scheduledDate: booking.scheduledDate,
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
          include: { site: true },
        });

        let hasNearbyJob = false;
        for (const job of existingJobs) {
          if (hasSiteCoords && siteCoords.result && job.site.latitude && job.site.longitude) {
            const jobDistance = calculateDistance(
              siteCoords.result.latitude,
              siteCoords.result.longitude,
              job.site.latitude,
              job.site.longitude
            );
            if (jobDistance <= 10) {
              hasNearbyJob = true;
              break;
            }
          } else {
            // Fallback to postcode prefix comparison
            const jobArea = getPostcodeArea(job.site.postcode);
            if (jobArea === sitePostcodeArea) {
              hasNearbyJob = true;
              break;
            }
          }
        }

        if (hasNearbyJob) {
          score += 20; // Big bonus for route efficiency
          reasons.push(`Already has nearby job on same day - very efficient`);
        } else if (existingJobsOnDay <= 2) {
          score += 5;
          reasons.push(`Has ${existingJobsOnDay} other job(s) on this day`);
        }
      } else {
        score += 8;
        reasons.push("Day is free - flexible scheduling");
      }

      // 6. Experience bonus
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
        hasValidQualification,
        isAvailable: true,
        existingJobsOnDay,
        distanceKm,
        travelTime,
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

export async function getBookingAllocationExplanation(bookingId: string) {
  try {
    const [allocationLogs, scoreLogs] = await Promise.all([
      db.allocationLog.findMany({
        where: { bookingId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      db.allocationScoreLog.findMany({
        where: { bookingId },
        orderBy: { compositeScore: "desc" },
        take: 5,
      }),
    ]);

    // Get engineer names for score logs
    const engineerIds = scoreLogs.map((s) => s.engineerId);
    const engineers = await db.user.findMany({
      where: { id: { in: engineerIds } },
      select: { id: true, name: true },
    });

    const engineerMap = new Map(engineers.map((e) => [e.id, e.name]));

    return {
      currentAllocation: allocationLogs[0] ?? null,
      scoredCandidates: scoreLogs.map((log) => ({
        engineerId: log.engineerId,
        engineerName: engineerMap.get(log.engineerId) ?? "Unknown",
        customerScore: log.customerScore,
        engineerScore: log.engineerScore,
        platformScore: log.platformScore,
        compositeScore: log.compositeScore,
        factors: log.factors as Array<{
          id: string;
          name: string;
          party: string;
          normalizedScore: number;
          contribution: number;
          explanation?: string;
        }>,
        wasSelected: log.wasSelected,
      })),
    };
  } catch (error) {
    console.error("Error fetching allocation explanation:", error);
    return { currentAllocation: null, scoredCandidates: [] };
  }
}

export async function overrideAllocation(
  bookingId: string,
  newEngineerId: string,
  adminReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await reallocateBooking(bookingId, newEngineerId, adminReason);

    if (result.success) {
      await db.allocationLog.create({
        data: {
          bookingId,
          action: "ADMIN_OVERRIDE",
          toEngineerId: newEngineerId,
          reason: adminReason,
        },
      });

      revalidatePath("/admin/scheduling/calendar");
    }

    return result;
  } catch (error) {
    console.error("Error overriding allocation:", error);
    return { success: false, error: "Override failed" };
  }
}
