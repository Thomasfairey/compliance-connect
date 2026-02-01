/**
 * V2 Allocator - Orchestration Layer
 *
 * Orchestrates the allocation process using the multi-objective scorer.
 * Supports shadow mode for gradual rollout and comparison with V1.
 */

import { db } from "@/lib/db";
import { scoreSlotAllocation, getScoreSummary } from "./scorer";
import { lookupPostcode } from "@/lib/postcodes";
import type {
  AllocationResultV2,
  AllocationCandidate,
  BookingRequest,
  ScheduleSlot,
  EngineerWithProfile,
  ScoringWeights,
  SchedulingFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from "./types";

// =============================================================================
// MAIN ALLOCATION FUNCTION
// =============================================================================

/**
 * Find the best engineer for a booking using V2 multi-objective scoring
 */
export async function findBestEngineerV2(
  bookingId: string,
  options: {
    weights?: ScoringWeights;
    shadowMode?: boolean;
    preferredDate?: Date;
  } = {}
): Promise<AllocationResultV2> {
  const {
    weights = { customer: 0.4, engineer: 0.3, platform: 0.3 },
    shadowMode = false,
  } = options;

  try {
    // Get booking details
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        site: true,
        service: true,
        customer: true,
      },
    });

    if (!booking) {
      return { success: false, candidates: [], error: "Booking not found" };
    }

    // Build booking request
    const bookingRequest: BookingRequest = {
      customerId: booking.customerId,
      siteId: booking.siteId,
      serviceId: booking.serviceId,
      preferredDate: options.preferredDate ?? booking.scheduledDate,
      preferredTimes: [booking.slot as "AM" | "PM"],
      estimatedQty: booking.estimatedQty,
      notes: booking.notes ?? undefined,
    };

    // Get all viable engineers
    const engineers = await getViableEngineers(booking.serviceId, booking.scheduledDate);

    if (engineers.length === 0) {
      return {
        success: false,
        candidates: [],
        error: "No qualified engineers available",
      };
    }

    // Score each engineer
    const candidates: AllocationCandidate[] = [];

    for (const engineer of engineers) {
      // Check basic viability
      const viability = await checkEngineerViability(
        engineer,
        booking.serviceId,
        booking.scheduledDate
      );

      if (!viability.isViable) {
        candidates.push({
          engineer,
          slot: createSlotForEngineer(engineer, booking),
          score: {
            customerScore: 0,
            engineerScore: 0,
            platformScore: 0,
            compositeScore: 0,
            weights,
            factors: [],
            calculatedAt: new Date(),
          },
          isViable: false,
          nonViableReasons: viability.reasons,
        });
        continue;
      }

      // Create slot and score
      const slot = createSlotForEngineer(engineer, booking);
      const score = await scoreSlotAllocation(slot, bookingRequest, engineer, weights);

      candidates.push({
        engineer,
        slot,
        score,
        isViable: true,
      });
    }

    // Sort by composite score (viable candidates only)
    candidates.sort((a, b) => {
      if (!a.isViable && !b.isViable) return 0;
      if (!a.isViable) return 1;
      if (!b.isViable) return -1;
      return b.score.compositeScore - a.score.compositeScore;
    });

    const bestCandidate = candidates.find((c) => c.isViable);

    if (!bestCandidate) {
      return {
        success: false,
        candidates,
        error: "No suitable engineer found after scoring",
      };
    }

    // Log the allocation decision
    await logAllocationDecision(bookingId, bestCandidate, candidates, shadowMode);

    // If shadow mode, compare with V1
    let v1Comparison;
    if (shadowMode) {
      v1Comparison = await compareWithV1(bookingId, bestCandidate);
    }

    return {
      success: true,
      selected: bestCandidate,
      candidates,
      v1Comparison,
    };
  } catch (error) {
    console.error("V2 Allocation error:", error);
    return {
      success: false,
      candidates: [],
      error: `Allocation failed: ${error}`,
    };
  }
}

/**
 * Auto-allocate a booking using V2 and update the database
 */
export async function autoAllocateBookingV2(
  bookingId: string,
  options: {
    weights?: ScoringWeights;
    shadowMode?: boolean;
  } = {}
): Promise<AllocationResultV2> {
  const result = await findBestEngineerV2(bookingId, options);

  if (!result.success || !result.selected) {
    return result;
  }

  // If not shadow mode, actually assign the engineer
  if (!options.shadowMode) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        engineerId: result.selected.engineer.user.id,
        status: "CONFIRMED",
      },
    });

    // Create allocation log
    await db.allocationLog.create({
      data: {
        bookingId,
        action: "AUTO_ASSIGNED_V2",
        toEngineerId: result.selected.engineer.user.id,
        reason: getScoreSummary(result.selected.score),
        score: result.selected.score.compositeScore,
        metadata: JSON.parse(JSON.stringify({
          version: "v2",
          weights: result.selected.score.weights,
          candidateCount: result.candidates.length,
          customerScore: result.selected.score.customerScore,
          engineerScore: result.selected.score.engineerScore,
          platformScore: result.selected.score.platformScore,
        })),
      },
    });
  }

  return result;
}

// =============================================================================
// VIABLE SLOTS
// =============================================================================

/**
 * Get all viable slots for a booking request
 */
export async function getViableSlots(
  booking: BookingRequest,
  options: {
    dateRange?: { start: Date; end: Date };
    maxSlots?: number;
  } = {}
): Promise<ScheduleSlot[]> {
  const {
    dateRange = {
      start: new Date(),
      end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
    },
    maxSlots = 20,
  } = options;

  const slots: ScheduleSlot[] = [];

  // Get viable engineers
  const engineers = await getViableEngineers(booking.serviceId, dateRange.start);

  // Get site for proximity checking
  const site = await db.site.findUnique({
    where: { id: booking.siteId },
    select: { postcode: true, latitude: true, longitude: true },
  });

  // Generate slots for each engineer x date x time combination
  for (const engineer of engineers) {
    let currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end && slots.length < maxSlots) {
      // Check engineer availability for this date
      const availability = await checkDayAvailability(engineer, currentDate);

      for (const timeSlot of availability.availableSlots) {
        // Check for nearby jobs (cluster opportunity)
        const nearbyJobs = await countNearbyJobsForEngineer(
          engineer.user.id,
          currentDate,
          site?.latitude ?? 0,
          site?.longitude ?? 0
        );

        slots.push({
          id: `${engineer.user.id}-${currentDate.toISOString()}-${timeSlot}`,
          date: new Date(currentDate),
          slot: timeSlot as "AM" | "PM",
          startTime: timeSlot === "AM" ? "09:00" : "13:00",
          endTime: timeSlot === "AM" ? "12:00" : "17:00",
          engineerId: engineer.user.id,
          estimatedPrice: await estimatePrice(booking.serviceId, booking.estimatedQty),
          estimatedDuration: await estimateDuration(booking.serviceId, booking.estimatedQty),
          isClusterOpportunity: nearbyJobs > 0,
          nearbyJobCount: nearbyJobs,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return slots.slice(0, maxSlots);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all engineers who could potentially handle this service
 */
async function getViableEngineers(
  serviceId: string,
  date: Date
): Promise<EngineerWithProfile[]> {
  const engineers = await db.user.findMany({
    where: {
      role: "ENGINEER",
      engineerProfile: {
        status: "APPROVED",
        competencies: {
          some: { serviceId },
        },
      },
    },
    include: {
      engineerProfile: {
        include: {
          competencies: true,
          coverageAreas: true,
          qualifications: true,
          availability: {
            where: { date },
          },
        },
      },
    },
  });

  return engineers
    .filter((e) => e.engineerProfile)
    .map((e) => ({
      user: e,
      profile: e.engineerProfile!,
      coverageAreas: e.engineerProfile!.coverageAreas,
      competencies: e.engineerProfile!.competencies,
      qualifications: e.engineerProfile!.qualifications,
      basePostcode: e.engineerProfile!.coverageAreas[0]?.postcodePrefix + "1 1AA" || "EC1A 1AA",
      preferredRadiusKm: e.engineerProfile!.coverageAreas[0]?.radiusKm || 20,
    }));
}

/**
 * Check if an engineer is viable for a specific service and date
 */
async function checkEngineerViability(
  engineer: EngineerWithProfile,
  serviceId: string,
  date: Date
): Promise<{ isViable: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Check competency
  const hasCompetency = engineer.competencies.some((c) => c.serviceId === serviceId);
  if (!hasCompetency) {
    reasons.push("No competency for this service");
    return { isViable: false, reasons };
  }

  // Check qualifications aren't expired
  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { name: true },
  });

  const relevantQuals = engineer.qualifications.filter((q) => {
    const serviceName = service?.name?.toLowerCase() ?? "";
    const qualName = q.name.toLowerCase();

    if (serviceName.includes("pat")) {
      return qualName.includes("pat") || qualName.includes("portable");
    }
    if (serviceName.includes("electric") || serviceName.includes("eicr")) {
      return qualName.includes("18th") || qualName.includes("electrical");
    }
    return true;
  });

  const hasValidQual = relevantQuals.some(
    (q) => !q.expiryDate || new Date(q.expiryDate) >= date
  );

  if (relevantQuals.length > 0 && !hasValidQual) {
    reasons.push("Qualifications expired");
    return { isViable: false, reasons };
  }

  // Check availability
  const dayAvailability = await checkDayAvailability(engineer, date);
  if (dayAvailability.availableSlots.length === 0) {
    reasons.push("Not available on this date");
    return { isViable: false, reasons };
  }

  return { isViable: true, reasons: [] };
}

/**
 * Check engineer availability for a specific day
 */
async function checkDayAvailability(
  engineer: EngineerWithProfile,
  date: Date
): Promise<{ availableSlots: string[] }> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get explicit availability records
  const availabilityRecords = await db.engineerAvailability.findMany({
    where: {
      engineerProfileId: engineer.profile.id,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  // Get existing bookings
  const existingBookings = await db.booking.count({
    where: {
      engineerId: engineer.user.id,
      scheduledDate: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
  });

  // Default: both slots available if no restrictions
  const availableSlots: string[] = [];

  // Check AM slot
  const amBlocked = availabilityRecords.some(
    (r) => (r.slot === "AM" || r.slot === "FULL_DAY") && !r.isAvailable
  );
  if (!amBlocked && existingBookings < 7) {
    availableSlots.push("AM");
  }

  // Check PM slot
  const pmBlocked = availabilityRecords.some(
    (r) => (r.slot === "PM" || r.slot === "FULL_DAY") && !r.isAvailable
  );
  if (!pmBlocked && existingBookings < 7) {
    availableSlots.push("PM");
  }

  return { availableSlots };
}

/**
 * Create a slot object for an engineer
 */
function createSlotForEngineer(
  engineer: EngineerWithProfile,
  booking: { scheduledDate: Date; slot: string; quotedPrice: number; estimatedDuration: number | null }
): ScheduleSlot {
  return {
    id: `${engineer.user.id}-${booking.scheduledDate.toISOString()}-${booking.slot}`,
    date: booking.scheduledDate,
    slot: booking.slot as "AM" | "PM",
    startTime: booking.slot === "AM" ? "09:00" : "13:00",
    endTime: booking.slot === "AM" ? "12:00" : "17:00",
    engineerId: engineer.user.id,
    estimatedPrice: booking.quotedPrice,
    estimatedDuration: booking.estimatedDuration ?? 60,
    isClusterOpportunity: false,
    nearbyJobCount: 0,
  };
}

/**
 * Count nearby jobs for cluster detection
 */
async function countNearbyJobsForEngineer(
  engineerId: string,
  date: Date,
  lat: number,
  lng: number,
  radiusKm = 5
): Promise<number> {
  if (!lat || !lng) return 0;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const jobs = await db.booking.findMany({
    where: {
      engineerId,
      scheduledDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
    },
    include: {
      site: { select: { latitude: true, longitude: true } },
    },
  });

  let count = 0;
  for (const job of jobs) {
    if (job.site.latitude && job.site.longitude) {
      const distance = haversineDistance(lat, lng, job.site.latitude, job.site.longitude);
      if (distance <= radiusKm) count++;
    }
  }

  return count;
}

/**
 * Estimate price for a service
 */
async function estimatePrice(serviceId: string, qty: number): Promise<number> {
  const service = await db.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) return 0;

  const calculated = service.basePrice * qty;
  return Math.max(service.minCharge, calculated);
}

/**
 * Estimate duration for a service
 */
async function estimateDuration(serviceId: string, qty: number): Promise<number> {
  const service = await db.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) return 60;

  return service.baseMinutes + service.minutesPerUnit * qty;
}

/**
 * Log allocation decision for analysis
 */
async function logAllocationDecision(
  bookingId: string,
  selected: AllocationCandidate,
  allCandidates: AllocationCandidate[],
  shadowMode: boolean
): Promise<void> {
  // Log the selected candidate
  await db.allocationScoreLog.create({
    data: {
      bookingId,
      engineerId: selected.engineer.user.id,
      customerScore: selected.score.customerScore,
      engineerScore: selected.score.engineerScore,
      platformScore: selected.score.platformScore,
      compositeScore: selected.score.compositeScore,
      customerWeight: selected.score.weights.customer,
      engineerWeight: selected.score.weights.engineer,
      platformWeight: selected.score.weights.platform,
      factors: JSON.parse(JSON.stringify(selected.score.factors)),
      wasSelected: !shadowMode, // Only true if actually selected
      v2Rank: 1,
    },
  });

  // Log top alternatives for analysis
  const viableCandidates = allCandidates.filter((c) => c.isViable);
  for (let i = 1; i < Math.min(3, viableCandidates.length); i++) {
    const candidate = viableCandidates[i];
    await db.allocationScoreLog.create({
      data: {
        bookingId,
        engineerId: candidate.engineer.user.id,
        customerScore: candidate.score.customerScore,
        engineerScore: candidate.score.engineerScore,
        platformScore: candidate.score.platformScore,
        compositeScore: candidate.score.compositeScore,
        customerWeight: candidate.score.weights.customer,
        engineerWeight: candidate.score.weights.engineer,
        platformWeight: candidate.score.weights.platform,
        factors: JSON.parse(JSON.stringify(candidate.score.factors)),
        wasSelected: false,
        v2Rank: i + 1,
      },
    });
  }
}

/**
 * Compare V2 decision with V1 (for shadow mode)
 */
async function compareWithV1(
  bookingId: string,
  v2Selected: AllocationCandidate
): Promise<{
  v1EngineerId: string;
  v1Score: number;
  wouldHaveChanged: boolean;
  improvementPercent: number;
}> {
  // Import V1 allocator dynamically to avoid circular deps
  const { findBestEngineer } = await import("@/lib/actions/allocation");
  const v1Result = await findBestEngineer(bookingId);

  if (!v1Result.success || !v1Result.engineerId) {
    return {
      v1EngineerId: "",
      v1Score: 0,
      wouldHaveChanged: true,
      improvementPercent: 100,
    };
  }

  const wouldHaveChanged = v1Result.engineerId !== v2Selected.engineer.user.id;
  const improvementPercent = v1Result.score
    ? ((v2Selected.score.compositeScore - v1Result.score) / v1Result.score) * 100
    : 0;

  return {
    v1EngineerId: v1Result.engineerId,
    v1Score: v1Result.score ?? 0,
    wouldHaveChanged,
    improvementPercent,
  };
}

/**
 * Haversine distance calculation
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
