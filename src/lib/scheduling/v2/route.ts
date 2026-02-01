/**
 * Route Continuity Analyzer
 *
 * Analyzes how well a new job fits into an engineer's existing route,
 * considering direction alignment, gap utilization, and insertion cost.
 */

import { db } from "@/lib/db";
import {
  lookupPostcode,
  calculateDistance,
  estimateDrivingTimeMinutes,
} from "@/lib/postcodes";
import { calculateBearing, estimateTravelTime } from "./travel";
import type {
  RouteContinuity,
  TimeGap,
  Coordinates,
  EngineerWithProfile,
  OptimizedRoute,
  RouteStop,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum gap duration to be considered fillable (minutes) */
const MIN_GAP_DURATION = 45;

/** Standard job duration assumption (minutes) */
const DEFAULT_JOB_DURATION = 60;

/** Weight for insertion cost in score */
const INSERTION_COST_WEIGHT = 0.5;

/** Weight for gap utilization in score */
const GAP_UTILIZATION_WEIGHT = 0.3;

/** Weight for direction alignment in score */
const DIRECTION_ALIGNMENT_WEIGHT = 0.2;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate route continuity score for adding a job
 */
export async function calculateRouteContinuity(
  engineer: EngineerWithProfile,
  date: Date,
  newJobPostcode: string,
  proposedSlot?: string
): Promise<RouteContinuity> {
  const existingJobs = await getEngineerJobsForDate(engineer.user.id, date);

  // No existing route - neutral score
  if (existingJobs.length === 0) {
    return {
      insertionCost: 0,
      score: 70,
      gapUtilization: 0,
      directionAlignment: 1,
    };
  }

  const newJobCoords = await getPostcodeCoordinates(newJobPostcode);
  if (!newJobCoords) {
    return {
      insertionCost: 0,
      score: 50,
      gapUtilization: 0,
      directionAlignment: 0.5,
    };
  }

  // Single existing job - check direction from base
  if (existingJobs.length === 1) {
    const alignment = await calculateDirectionFromBase(
      engineer.basePostcode,
      existingJobs[0].postcode,
      newJobPostcode
    );

    return {
      insertionCost: alignment.detourKm,
      score: 50 + alignment.alignmentScore * 50,
      gapUtilization: 0.5,
      directionAlignment: alignment.alignmentScore,
    };
  }

  // Multiple jobs - full route analysis
  const currentRoute = await buildCurrentRoute(existingJobs, engineer.basePostcode);
  const insertionAnalysis = await analyzeInsertion(
    currentRoute,
    newJobCoords,
    newJobPostcode,
    proposedSlot
  );

  // Find and analyze time gaps
  const gaps = findTimeGaps(existingJobs);
  const gapUtilization = calculateGapUtilization(gaps, proposedSlot);

  // Calculate direction alignment
  const directionAlignment = calculateOverallDirectionAlignment(
    currentRoute,
    newJobCoords
  );

  // Calculate composite score
  const insertionScore = calculateInsertionScore(insertionAnalysis.additionalKm);
  const score =
    insertionScore * INSERTION_COST_WEIGHT +
    gapUtilization * 100 * GAP_UTILIZATION_WEIGHT +
    directionAlignment * 100 * DIRECTION_ALIGNMENT_WEIGHT;

  return {
    insertionCost: insertionAnalysis.additionalKm,
    score: Math.round(Math.min(100, Math.max(0, score))),
    gapUtilization,
    directionAlignment,
  };
}

// =============================================================================
// DIRECTION ALIGNMENT
// =============================================================================

/**
 * Calculate direction alignment from base through existing job to new job
 */
async function calculateDirectionFromBase(
  basePostcode: string,
  existingJobPostcode: string,
  newJobPostcode: string
): Promise<{ alignmentScore: number; detourKm: number }> {
  const [base, existing, newJob] = await Promise.all([
    getPostcodeCoordinates(basePostcode),
    getPostcodeCoordinates(existingJobPostcode),
    getPostcodeCoordinates(newJobPostcode),
  ]);

  if (!base || !existing || !newJob) {
    return { alignmentScore: 0.5, detourKm: 10 };
  }

  // Calculate bearing from base to existing job
  const routeBearing = calculateBearing(base.lat, base.lng, existing.lat, existing.lng);

  // Calculate bearing from base to new job
  const newJobBearing = calculateBearing(base.lat, base.lng, newJob.lat, newJob.lng);

  // Difference in bearings (0-180 degrees)
  let bearingDiff = Math.abs(routeBearing - newJobBearing);
  if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;

  // 0 degrees = perfect alignment (score 1.0)
  // 90 degrees = perpendicular (score 0.5)
  // 180 degrees = opposite direction (score 0.0)
  const alignmentScore = 1 - bearingDiff / 180;

  // Calculate actual detour
  const directDistance = calculateDistance(base.lat, base.lng, existing.lat, existing.lng);
  const viaNewJob =
    calculateDistance(base.lat, base.lng, newJob.lat, newJob.lng) +
    calculateDistance(newJob.lat, newJob.lng, existing.lat, existing.lng);

  const detourKm = Math.max(0, viaNewJob - directDistance);

  return { alignmentScore, detourKm };
}

/**
 * Calculate overall direction alignment with existing route
 */
function calculateOverallDirectionAlignment(
  route: RouteStopWithCoords[],
  newJobCoords: Coordinates
): number {
  if (route.length < 2) return 0.5;

  // Calculate the general direction of the route
  const first = route[0];
  const last = route[route.length - 1];

  if (!first.coords || !last.coords) return 0.5;

  const routeBearing = calculateBearing(
    first.coords.lat,
    first.coords.lng,
    last.coords.lat,
    last.coords.lng
  );

  // Check if new job is roughly in the same direction
  const newJobBearing = calculateBearing(
    first.coords.lat,
    first.coords.lng,
    newJobCoords.lat,
    newJobCoords.lng
  );

  let bearingDiff = Math.abs(routeBearing - newJobBearing);
  if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;

  // Also check distance from the route "corridor"
  const corridorAlignment = calculateCorridorAlignment(route, newJobCoords);

  // Combine bearing alignment and corridor alignment
  const bearingScore = 1 - bearingDiff / 180;
  return (bearingScore + corridorAlignment) / 2;
}

/**
 * Calculate how close the new job is to the route corridor
 */
function calculateCorridorAlignment(
  route: RouteStopWithCoords[],
  newJobCoords: Coordinates
): number {
  if (route.length < 2) return 0.5;

  // Find minimum distance from new job to any point on the route
  let minDistance = Infinity;

  for (const stop of route) {
    if (!stop.coords) continue;
    const distance = calculateDistance(
      stop.coords.lat,
      stop.coords.lng,
      newJobCoords.lat,
      newJobCoords.lng
    );
    minDistance = Math.min(minDistance, distance);
  }

  // Score based on distance from route
  // < 2km = excellent (1.0)
  // 2-5km = good (0.7-0.9)
  // 5-10km = acceptable (0.4-0.7)
  // > 10km = poor (0-0.4)
  if (minDistance < 2) return 1.0;
  if (minDistance < 5) return 0.7 + ((5 - minDistance) / 3) * 0.2;
  if (minDistance < 10) return 0.4 + ((10 - minDistance) / 5) * 0.3;
  return Math.max(0, 0.4 - (minDistance - 10) * 0.02);
}

// =============================================================================
// GAP ANALYSIS
// =============================================================================

/**
 * Find time gaps in the schedule
 */
export function findTimeGaps(jobs: ExistingJob[]): TimeGap[] {
  if (jobs.length === 0) return [];

  const sortedJobs = [...jobs].sort((a, b) => {
    const timeA = slotToMinutes(a.slot);
    const timeB = slotToMinutes(b.slot);
    return timeA - timeB;
  });

  const gaps: TimeGap[] = [];

  // Check gap at start of day (before first job)
  const firstJobStart = slotToMinutes(sortedJobs[0].slot);
  if (firstJobStart > 9 * 60) {
    // After 9am
    gaps.push({
      start: "09:00",
      end: minutesToTime(firstJobStart),
      durationMinutes: firstJobStart - 9 * 60,
    });
  }

  // Check gaps between jobs
  for (let i = 0; i < sortedJobs.length - 1; i++) {
    const current = sortedJobs[i];
    const next = sortedJobs[i + 1];

    const currentEnd = slotToMinutes(current.slot) + (current.estimatedDuration ?? DEFAULT_JOB_DURATION);
    const nextStart = slotToMinutes(next.slot);

    const gapDuration = nextStart - currentEnd;
    if (gapDuration >= MIN_GAP_DURATION) {
      gaps.push({
        start: minutesToTime(currentEnd),
        end: minutesToTime(nextStart),
        durationMinutes: gapDuration,
        previousJobId: current.id,
        nextJobId: next.id,
      });
    }
  }

  // Check gap at end of day (after last job)
  const lastJob = sortedJobs[sortedJobs.length - 1];
  const lastJobEnd = slotToMinutes(lastJob.slot) + (lastJob.estimatedDuration ?? DEFAULT_JOB_DURATION);
  if (lastJobEnd < 17 * 60) {
    // Before 5pm
    gaps.push({
      start: minutesToTime(lastJobEnd),
      end: "17:00",
      durationMinutes: 17 * 60 - lastJobEnd,
      previousJobId: lastJob.id,
    });
  }

  return gaps;
}

/**
 * Calculate how well the proposed slot fills gaps
 */
function calculateGapUtilization(gaps: TimeGap[], proposedSlot?: string): number {
  if (gaps.length === 0) return 0;

  // If no slot specified, check if there are gaps that could be filled
  if (!proposedSlot) {
    // Return a score based on gap availability
    const totalGapMinutes = gaps.reduce((sum, g) => sum + g.durationMinutes, 0);
    // More gaps = more opportunity
    return Math.min(1, totalGapMinutes / 180); // 3 hours of gaps = max
  }

  // Check if proposed slot fits into a gap
  const slotStart = slotToMinutes(proposedSlot);
  const slotEnd = slotStart + DEFAULT_JOB_DURATION;

  for (const gap of gaps) {
    const gapStart = timeToMinutes(gap.start);
    const gapEnd = timeToMinutes(gap.end);

    if (slotStart >= gapStart && slotEnd <= gapEnd) {
      // Perfectly fills the gap
      const utilizationRatio = DEFAULT_JOB_DURATION / gap.durationMinutes;
      return Math.min(1, utilizationRatio);
    }
  }

  return 0; // Doesn't fit any gap
}

// =============================================================================
// INSERTION ANALYSIS
// =============================================================================

interface InsertionAnalysis {
  additionalKm: number;
  additionalMinutes: number;
  optimalPosition: number;
}

/**
 * Analyze the cost of inserting a new job into the route
 */
async function analyzeInsertion(
  route: RouteStopWithCoords[],
  newJobCoords: Coordinates,
  newJobPostcode: string,
  proposedSlot?: string
): Promise<InsertionAnalysis> {
  if (route.length === 0) {
    return { additionalKm: 0, additionalMinutes: 0, optimalPosition: 0 };
  }

  // Try inserting at each position and find optimal
  let bestPosition = 0;
  let bestCost = Infinity;

  for (let i = 0; i <= route.length; i++) {
    const cost = await calculateInsertionCost(route, newJobCoords, i);
    if (cost.additionalKm < bestCost) {
      bestCost = cost.additionalKm;
      bestPosition = i;
    }
  }

  return {
    additionalKm: Math.max(0, bestCost),
    additionalMinutes: estimateDrivingTimeMinutes(Math.max(0, bestCost)),
    optimalPosition: bestPosition,
  };
}

/**
 * Calculate cost of inserting at a specific position
 */
async function calculateInsertionCost(
  route: RouteStopWithCoords[],
  newJobCoords: Coordinates,
  position: number
): Promise<{ additionalKm: number }> {
  const before = position > 0 ? route[position - 1] : null;
  const after = position < route.length ? route[position] : null;

  let additionalKm = 0;

  if (before?.coords && after?.coords) {
    // Inserting in middle
    const directDistance = calculateDistance(
      before.coords.lat,
      before.coords.lng,
      after.coords.lat,
      after.coords.lng
    );
    const viaNewJob =
      calculateDistance(
        before.coords.lat,
        before.coords.lng,
        newJobCoords.lat,
        newJobCoords.lng
      ) +
      calculateDistance(
        newJobCoords.lat,
        newJobCoords.lng,
        after.coords.lat,
        after.coords.lng
      );
    additionalKm = viaNewJob - directDistance;
  } else if (before?.coords) {
    // Appending at end
    additionalKm = calculateDistance(
      before.coords.lat,
      before.coords.lng,
      newJobCoords.lat,
      newJobCoords.lng
    );
  } else if (after?.coords) {
    // Prepending at start
    additionalKm = calculateDistance(
      newJobCoords.lat,
      newJobCoords.lng,
      after.coords.lat,
      after.coords.lng
    );
  }

  return { additionalKm: Math.max(0, additionalKm) };
}

/**
 * Calculate score from insertion cost
 */
function calculateInsertionScore(additionalKm: number): number {
  // Perfect: 0km additional = 100
  // Good: < 3km = 80-100
  // Acceptable: 3-10km = 50-80
  // Poor: > 10km = 0-50

  if (additionalKm <= 0) return 100;
  if (additionalKm < 3) return 80 + ((3 - additionalKm) / 3) * 20;
  if (additionalKm < 10) return 50 + ((10 - additionalKm) / 7) * 30;
  return Math.max(0, 50 - (additionalKm - 10) * 2.5);
}

// =============================================================================
// HELPER TYPES & FUNCTIONS
// =============================================================================

interface ExistingJob {
  id: string;
  postcode: string;
  slot: string;
  estimatedDuration: number | null;
}

interface RouteStopWithCoords {
  job: ExistingJob;
  coords: Coordinates | null;
}

/**
 * Get jobs for an engineer on a date
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
      scheduledDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ["CONFIRMED", "IN_PROGRESS", "EN_ROUTE", "ON_SITE"] },
    },
    include: { site: true },
    orderBy: { slot: "asc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    postcode: b.site.postcode,
    slot: b.slot,
    estimatedDuration: b.estimatedDuration,
  }));
}

/**
 * Build route with coordinates
 */
async function buildCurrentRoute(
  jobs: ExistingJob[],
  basePostcode: string
): Promise<RouteStopWithCoords[]> {
  return Promise.all(
    jobs.map(async (job) => ({
      job,
      coords: await getPostcodeCoordinates(job.postcode),
    }))
  );
}

/**
 * Get coordinates for a postcode
 */
async function getPostcodeCoordinates(
  postcode: string
): Promise<Coordinates | null> {
  const result = await lookupPostcode(postcode);
  if (!result.success || !result.result) return null;
  return { lat: result.result.latitude, lng: result.result.longitude };
}

/**
 * Convert slot (AM/PM) to minutes from midnight
 */
function slotToMinutes(slot: string): number {
  if (slot === "AM") return 9 * 60; // 9am
  if (slot === "PM") return 13 * 60; // 1pm
  // Try parsing as HH:MM
  const match = slot.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 9 * 60; // Default to 9am
}

/**
 * Convert minutes to HH:MM time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Convert HH:MM to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
