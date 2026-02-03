/**
 * Travel Efficiency Calculator
 *
 * Calculates travel efficiency scores for job assignments,
 * analyzing how well a new job fits into an engineer's existing route.
 */

import { db } from "@/lib/db";
import {
  lookupPostcode,
  calculateDistance,
  estimateDrivingTimeMinutes,
  getPostcodeDistrict,
} from "@/lib/postcodes";
import type {
  TravelEfficiency,
  RouteInsertion,
  RouteContext,
  EngineerWithProfile,
  Coordinates,
  OptimizedRoute,
  RouteStop,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Very close - clustered jobs */
const CLUSTER_THRESHOLD_KM = 2;
/** Close enough to be nearby */
const NEARBY_THRESHOLD_KM = 5;
/** Acceptable detour */
const DETOUR_THRESHOLD_KM = 15;
/** Maximum reasonable distance */
const DISTANT_THRESHOLD_KM = 30;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate travel efficiency for assigning a job to an engineer on a specific date
 */
export async function calculateTravelEfficiency(
  engineer: EngineerWithProfile,
  date: Date,
  jobPostcode: string
): Promise<TravelEfficiency> {
  // Get job coordinates
  const jobCoords = await getPostcodeCoordinates(jobPostcode);
  if (!jobCoords) {
    // Can't calculate - return neutral score
    return {
      distanceKm: 0,
      travelMinutes: 0,
      efficiencyScore: 50,
      routeContext: "first_job",
      savingsVsNaive: 0,
      toPostcode: jobPostcode,
    };
  }

  // Get existing jobs for this engineer on this date
  const existingJobs = await getEngineerJobsForDate(engineer.user.id, date);

  if (existingJobs.length === 0) {
    // First job of the day - calculate from base
    return calculateFirstJobEfficiency(engineer, jobPostcode, jobCoords);
  }

  // Calculate how this job fits into existing route
  return calculateInsertionEfficiency(
    engineer,
    existingJobs,
    jobPostcode,
    jobCoords
  );
}

/**
 * Calculate efficiency for the first job of the day (from base)
 */
async function calculateFirstJobEfficiency(
  engineer: EngineerWithProfile,
  jobPostcode: string,
  jobCoords: Coordinates
): Promise<TravelEfficiency> {
  const basePostcode = engineer.basePostcode;
  const baseCoords = await getPostcodeCoordinates(basePostcode);

  if (!baseCoords) {
    return {
      distanceKm: 0,
      travelMinutes: 0,
      efficiencyScore: 70, // Neutral-ish for first job
      routeContext: "first_job",
      savingsVsNaive: 0,
      fromPostcode: basePostcode,
      toPostcode: jobPostcode,
    };
  }

  const distanceKm = calculateDistance(
    baseCoords.lat,
    baseCoords.lng,
    jobCoords.lat,
    jobCoords.lng
  );

  const travelMinutes = estimateDrivingTimeMinutes(distanceKm);
  const efficiencyScore = calculateDistanceScore(
    distanceKm,
    engineer.preferredRadiusKm
  );

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    travelMinutes,
    efficiencyScore,
    routeContext: "first_job",
    savingsVsNaive: 0,
    fromPostcode: basePostcode,
    toPostcode: jobPostcode,
  };
}

/**
 * Calculate efficiency when inserting into an existing route
 */
async function calculateInsertionEfficiency(
  engineer: EngineerWithProfile,
  existingJobs: ExistingJob[],
  jobPostcode: string,
  jobCoords: Coordinates
): Promise<TravelEfficiency> {
  // Analyze route insertion
  const insertion = await analyzeRouteInsertion(
    existingJobs,
    jobPostcode,
    jobCoords
  );

  // Determine context and score based on additional distance
  const { routeContext, efficiencyScore } = categorizeInsertion(
    insertion.additionalKm
  );

  // Calculate savings vs naive approach (going from base)
  const baseCoords = await getPostcodeCoordinates(engineer.basePostcode);
  let savingsVsNaive = 0;

  if (baseCoords) {
    const naiveDistance = calculateDistance(
      baseCoords.lat,
      baseCoords.lng,
      jobCoords.lat,
      jobCoords.lng
    );
    savingsVsNaive = Math.max(0, naiveDistance - insertion.additionalKm);
  }

  // Determine the "from" postcode (previous job in route)
  const fromPostcode =
    insertion.jobsBefore.length > 0
      ? existingJobs.find((j) => j.id === insertion.jobsBefore[0])?.postcode
      : engineer.basePostcode;

  return {
    distanceKm: Math.round(insertion.additionalKm * 10) / 10,
    travelMinutes: insertion.additionalMinutes,
    efficiencyScore,
    routeContext,
    savingsVsNaive: Math.round(savingsVsNaive * 10) / 10,
    fromPostcode,
    toPostcode: jobPostcode,
  };
}

/**
 * Analyze how inserting a new job affects the route
 */
export async function analyzeRouteInsertion(
  existingJobs: ExistingJob[],
  newJobPostcode: string,
  newJobCoords: Coordinates
): Promise<RouteInsertion> {
  if (existingJobs.length === 0) {
    return {
      additionalKm: 0,
      additionalMinutes: 0,
      optimalPosition: 0,
      displacesCurrent: false,
      jobsBefore: [],
      jobsAfter: [],
    };
  }

  // Sort by scheduled time
  const sortedJobs = [...existingJobs].sort((a, b) =>
    a.slot.localeCompare(b.slot)
  );

  // Calculate insertion cost at each position
  const insertionCosts: {
    position: number;
    additionalKm: number;
    additionalMinutes: number;
  }[] = [];

  // Get coordinates for all jobs
  const jobCoords = await Promise.all(
    sortedJobs.map(async (job) => ({
      job,
      coords: await getPostcodeCoordinates(job.postcode),
    }))
  );

  // Try inserting at each position
  for (let position = 0; position <= sortedJobs.length; position++) {
    const cost = await calculateInsertionCostAtPosition(
      jobCoords,
      newJobCoords,
      position
    );
    insertionCosts.push({ position, ...cost });
  }

  // Find optimal position (minimum additional distance)
  const optimal = insertionCosts.reduce((min, curr) =>
    curr.additionalKm < min.additionalKm ? curr : min
  );

  return {
    additionalKm: Math.max(0, optimal.additionalKm),
    additionalMinutes: Math.max(0, optimal.additionalMinutes),
    optimalPosition: optimal.position,
    displacesCurrent: false,
    jobsBefore: sortedJobs.slice(0, optimal.position).map((j) => j.id),
    jobsAfter: sortedJobs.slice(optimal.position).map((j) => j.id),
  };
}

/**
 * Calculate cost of inserting new job at a specific position
 */
async function calculateInsertionCostAtPosition(
  existingJobs: { job: ExistingJob; coords: Coordinates | null }[],
  newJobCoords: Coordinates,
  position: number
): Promise<{ additionalKm: number; additionalMinutes: number }> {
  const beforeJob = position > 0 ? existingJobs[position - 1] : null;
  const afterJob = position < existingJobs.length ? existingJobs[position] : null;

  let additionalKm = 0;

  if (beforeJob?.coords && afterJob?.coords) {
    // Inserting in middle - calculate detour
    const directDistance = calculateDistance(
      beforeJob.coords.lat,
      beforeJob.coords.lng,
      afterJob.coords.lat,
      afterJob.coords.lng
    );
    const viaNewJob =
      calculateDistance(
        beforeJob.coords.lat,
        beforeJob.coords.lng,
        newJobCoords.lat,
        newJobCoords.lng
      ) +
      calculateDistance(
        newJobCoords.lat,
        newJobCoords.lng,
        afterJob.coords.lat,
        afterJob.coords.lng
      );
    additionalKm = viaNewJob - directDistance;
  } else if (beforeJob?.coords) {
    // Appending at end
    additionalKm = calculateDistance(
      beforeJob.coords.lat,
      beforeJob.coords.lng,
      newJobCoords.lat,
      newJobCoords.lng
    );
  } else if (afterJob?.coords) {
    // Prepending at start
    additionalKm = calculateDistance(
      newJobCoords.lat,
      newJobCoords.lng,
      afterJob.coords.lat,
      afterJob.coords.lng
    );
  }

  return {
    additionalKm: Math.max(0, additionalKm),
    additionalMinutes: estimateDrivingTimeMinutes(Math.max(0, additionalKm)),
  };
}

/**
 * Categorize insertion based on additional distance
 */
function categorizeInsertion(additionalKm: number): {
  routeContext: RouteContext;
  efficiencyScore: number;
} {
  if (additionalKm < CLUSTER_THRESHOLD_KM) {
    // Clustered - excellent
    return {
      routeContext: "clustered",
      efficiencyScore: 95 + (CLUSTER_THRESHOLD_KM - additionalKm) * 2.5,
    };
  }

  if (additionalKm < NEARBY_THRESHOLD_KM) {
    // Nearby - very good
    const progress =
      (NEARBY_THRESHOLD_KM - additionalKm) /
      (NEARBY_THRESHOLD_KM - CLUSTER_THRESHOLD_KM);
    return {
      routeContext: "nearby",
      efficiencyScore: 80 + progress * 15,
    };
  }

  if (additionalKm < DETOUR_THRESHOLD_KM) {
    // Detour - acceptable
    const progress =
      (DETOUR_THRESHOLD_KM - additionalKm) /
      (DETOUR_THRESHOLD_KM - NEARBY_THRESHOLD_KM);
    return {
      routeContext: "detour",
      efficiencyScore: 50 + progress * 30,
    };
  }

  // Distant - poor
  const penalty = Math.min(50, (additionalKm - DETOUR_THRESHOLD_KM) * 1.5);
  return {
    routeContext: "distant",
    efficiencyScore: Math.max(0, 50 - penalty),
  };
}

/**
 * Calculate a normalized distance score (0-100)
 * Perfect score at 0km, decreases as distance increases
 */
export function calculateDistanceScore(
  distanceKm: number,
  preferredRadiusKm: number
): number {
  if (distanceKm <= 0) return 100;

  // Within preferred radius: 70-100
  if (distanceKm <= preferredRadiusKm) {
    const ratio = distanceKm / preferredRadiusKm;
    return 100 - ratio * 30;
  }

  // Beyond preferred radius: decreases more steeply
  const excess = distanceKm - preferredRadiusKm;
  const score = 70 - excess * 2;
  return Math.max(0, score);
}

/**
 * Build an optimized route for an engineer on a specific date
 */
export async function buildOptimizedRoute(
  engineerId: string,
  date: Date
): Promise<OptimizedRoute | null> {
  const jobs = await getEngineerJobsForDate(engineerId, date);

  if (jobs.length === 0) {
    return null;
  }

  // Get engineer base location
  const engineer = await db.user.findUnique({
    where: { id: engineerId },
    include: {
      engineerProfile: {
        include: { coverageAreas: true },
      },
    },
  });

  if (!engineer?.engineerProfile) return null;

  const basePostcode =
    engineer.engineerProfile.coverageAreas[0]?.postcodePrefix + "1 1AA";

  // Get all coordinates
  const jobsWithCoords = await Promise.all(
    jobs.map(async (job) => {
      const coords = await getPostcodeCoordinates(job.postcode);
      return { job, coords };
    })
  );

  // Simple nearest-neighbor TSP for now
  // TODO: Implement proper TSP solver for larger sets
  const stops: RouteStop[] = [];
  const remaining = [...jobsWithCoords];
  let currentCoords = await getPostcodeCoordinates(basePostcode);
  let totalKm = 0;
  let totalTravelMinutes = 0;
  let order = 1;

  while (remaining.length > 0 && currentCoords) {
    // Find nearest job
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].coords) {
        const distance = calculateDistance(
          currentCoords.lat,
          currentCoords.lng,
          remaining[i].coords!.lat,
          remaining[i].coords!.lng
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
    }

    const next = remaining.splice(nearestIndex, 1)[0];
    const travelMinutes = estimateDrivingTimeMinutes(nearestDistance);

    stops.push({
      bookingId: next.job.id,
      order,
      postcode: next.job.postcode,
      lat: next.coords?.lat ?? 0,
      lng: next.coords?.lng ?? 0,
      slot: next.job.slot,
      estimatedDuration: next.job.estimatedDuration ?? 60,
      distanceFromPrevious: Math.round(nearestDistance * 10) / 10,
      travelFromPrevious: travelMinutes,
    });

    totalKm += nearestDistance;
    totalTravelMinutes += travelMinutes;
    currentCoords = next.coords;
    order++;
  }

  // Calculate total day including work time
  const totalWorkMinutes = stops.reduce((sum, s) => sum + s.estimatedDuration, 0);

  return {
    engineerId,
    date,
    stops,
    totalKm: Math.round(totalKm * 10) / 10,
    totalTravelMinutes,
    totalDayMinutes: totalTravelMinutes + totalWorkMinutes,
    efficiencyRating: calculateRouteEfficiency(totalKm, stops.length),
  };
}

/**
 * Calculate route efficiency rating
 */
function calculateRouteEfficiency(totalKm: number, jobCount: number): number {
  if (jobCount <= 1) return 100;

  // Average km per job transition
  const avgKmPerTransition = totalKm / (jobCount - 1);

  // Excellent: < 3km average
  if (avgKmPerTransition < 3) return 95 + (3 - avgKmPerTransition) * 1.5;
  // Good: 3-5km average
  if (avgKmPerTransition < 5) return 80 + ((5 - avgKmPerTransition) / 2) * 15;
  // Acceptable: 5-10km average
  if (avgKmPerTransition < 10) return 50 + ((10 - avgKmPerTransition) / 5) * 30;
  // Poor: 10km+ average
  return Math.max(20, 50 - (avgKmPerTransition - 10) * 2);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ExistingJob {
  id: string;
  postcode: string;
  slot: string;
  estimatedDuration: number | null;
}

/**
 * Get all jobs for an engineer on a specific date
 */
async function getEngineerJobsForDate(
  engineerId: string,
  date: Date
): Promise<ExistingJob[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await db.booking.findMany({
    where: {
      engineerId,
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["CONFIRMED", "IN_PROGRESS", "EN_ROUTE", "ON_SITE"],
      },
    },
    include: {
      site: true,
    },
    orderBy: {
      slot: "asc",
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    postcode: b.site.postcode,
    slot: b.slot,
    estimatedDuration: b.estimatedDuration,
  }));
}

/**
 * Get coordinates for a postcode (with caching via postcodes.io)
 */
async function getPostcodeCoordinates(
  postcode: string
): Promise<Coordinates | null> {
  const result = await lookupPostcode(postcode);
  if (!result.success || !result.result) return null;

  return {
    lat: result.result.latitude,
    lng: result.result.longitude,
  };
}

/**
 * Calculate bearing between two points (for direction alignment)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Estimate travel time between two postcodes
 */
export async function estimateTravelTime(
  fromPostcode: string,
  toPostcode: string
): Promise<{ distanceKm: number; minutes: number }> {
  const [from, to] = await Promise.all([
    getPostcodeCoordinates(fromPostcode),
    getPostcodeCoordinates(toPostcode),
  ]);

  if (!from || !to) {
    return { distanceKm: 0, minutes: 0 };
  }

  const distanceKm = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  return {
    distanceKm,
    minutes: estimateDrivingTimeMinutes(distanceKm),
  };
}
