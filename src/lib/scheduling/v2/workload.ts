/**
 * Workload Balance Calculator
 *
 * Calculates workload balance scores to ensure fair distribution
 * of jobs among engineers and prevent overloading.
 */

import { db } from "@/lib/db";
import type { WorkloadBalance, EngineerWithProfile } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum recommended jobs per day */
const MAX_JOBS_PER_DAY = 7;

/** Ideal workload compared to average (slightly under = best) */
const IDEAL_WORKLOAD_RATIO = 0.9;

/** Overload threshold (above this = definitely overloaded) */
const OVERLOAD_THRESHOLD = 1.2;

/** Underload threshold (below this = significantly under) */
const UNDERLOAD_THRESHOLD = 0.5;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate workload balance for an engineer on a proposed date
 */
export async function calculateWorkloadBalance(
  engineer: EngineerWithProfile,
  proposedDate: Date
): Promise<WorkloadBalance> {
  const weekStart = getStartOfWeek(proposedDate);
  const weekEnd = getEndOfWeek(proposedDate);

  // Get this engineer's jobs for the week
  const engineerWeekJobs = await getEngineerWeeklyJobs(
    engineer.user.id,
    weekStart,
    weekEnd
  );

  // Get all engineers' stats for comparison
  const allEngineersStats = await getAllEngineersWeeklyStats(weekStart, weekEnd);

  // Calculate averages
  const avgJobsPerEngineer = calculateAverage(
    allEngineersStats.map((e) => e.jobCount)
  );
  const avgRevenuePerEngineer = calculateAverage(
    allEngineersStats.map((e) => e.revenue)
  );

  // This engineer's metrics
  const weeklyJobCount = engineerWeekJobs.length;
  const weeklyRevenue = engineerWeekJobs.reduce(
    (sum, j) => sum + (j.quotedPrice ?? 0),
    0
  );

  // Calculate weekly travel (approximate from postcodes)
  const weeklyTravelKm = await calculateWeeklyTravel(
    engineer.user.id,
    weekStart,
    weekEnd
  );

  // Compare to average
  const comparedToAverage =
    avgJobsPerEngineer > 0 ? weeklyJobCount / avgJobsPerEngineer : 1;

  // Jobs on the specific proposed date
  const jobsOnDay = await countJobsOnDate(engineer.user.id, proposedDate);

  // Calculate score
  const { score, isOverloaded, isUnderloaded } = calculateWorkloadScore(
    comparedToAverage,
    jobsOnDay
  );

  return {
    weeklyJobCount,
    weeklyRevenue: Math.round(weeklyRevenue * 100) / 100,
    weeklyTravelKm: Math.round(weeklyTravelKm * 10) / 10,
    comparedToAverage: Math.round(comparedToAverage * 100) / 100,
    score,
    isOverloaded,
    isUnderloaded,
    jobsOnDay,
    maxJobsPerDay: MAX_JOBS_PER_DAY,
  };
}

/**
 * Calculate workload score based on comparison to average
 */
function calculateWorkloadScore(
  comparedToAverage: number,
  jobsOnDay: number
): {
  score: number;
  isOverloaded: boolean;
  isUnderloaded: boolean;
} {
  let score: number;
  let isOverloaded = false;
  let isUnderloaded = false;

  if (comparedToAverage < UNDERLOAD_THRESHOLD) {
    // Very underloaded - give them work, but not highest priority
    // They might be new or have had cancellations
    score = 65 + comparedToAverage * 20;
    isUnderloaded = true;
  } else if (comparedToAverage < 0.8) {
    // Slightly under average - good candidate
    score = 85 + ((comparedToAverage - UNDERLOAD_THRESHOLD) / 0.3) * 15;
  } else if (comparedToAverage < 1.0) {
    // Just under average - best candidates
    score = 100;
  } else if (comparedToAverage < OVERLOAD_THRESHOLD) {
    // At or slightly above average - still acceptable
    score = 90 - ((comparedToAverage - 1.0) / 0.2) * 20;
  } else {
    // Overloaded - avoid giving more work
    score = Math.max(20, 70 - (comparedToAverage - OVERLOAD_THRESHOLD) * 50);
    isOverloaded = true;
  }

  // Additional penalty if already has too many jobs on this specific day
  if (jobsOnDay >= MAX_JOBS_PER_DAY) {
    score = Math.max(0, score - 30);
    isOverloaded = true;
  } else if (jobsOnDay >= MAX_JOBS_PER_DAY - 2) {
    // Getting close to max
    score = Math.max(0, score - 10);
  }

  return { score, isOverloaded, isUnderloaded };
}

/**
 * Get all engineers that could be compared
 */
export async function getAllEngineersWeeklyStats(
  weekStart: Date,
  weekEnd: Date
): Promise<{ engineerId: string; jobCount: number; revenue: number }[]> {
  const stats = await db.booking.groupBy({
    by: ["engineerId"],
    where: {
      scheduledDate: { gte: weekStart, lte: weekEnd },
      status: { notIn: ["CANCELLED", "DECLINED"] },
      engineerId: { not: null },
    },
    _count: { id: true },
    _sum: { quotedPrice: true },
  });

  return stats
    .filter((s) => s.engineerId !== null)
    .map((s) => ({
      engineerId: s.engineerId!,
      jobCount: s._count.id,
      revenue: s._sum.quotedPrice ?? 0,
    }));
}

/**
 * Get jobs for a specific engineer in a week
 */
async function getEngineerWeeklyJobs(
  engineerId: string,
  weekStart: Date,
  weekEnd: Date
) {
  return db.booking.findMany({
    where: {
      engineerId,
      scheduledDate: { gte: weekStart, lte: weekEnd },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    select: {
      id: true,
      quotedPrice: true,
      site: { select: { postcode: true } },
    },
  });
}

/**
 * Count jobs on a specific date for an engineer
 */
async function countJobsOnDate(
  engineerId: string,
  date: Date
): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db.booking.count({
    where: {
      engineerId,
      scheduledDate: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
  });
}

/**
 * Calculate total travel km for a week (approximate)
 * This is a simplified version - could be enhanced with actual route calculation
 */
async function calculateWeeklyTravel(
  engineerId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const jobs = await db.booking.findMany({
    where: {
      engineerId,
      scheduledDate: { gte: weekStart, lte: weekEnd },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    include: {
      site: { select: { postcode: true, latitude: true, longitude: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { slot: "asc" }],
  });

  if (jobs.length <= 1) return 0;

  // Group by date
  const jobsByDate = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const dateKey = job.scheduledDate.toISOString().split("T")[0];
    const existing = jobsByDate.get(dateKey) || [];
    existing.push(job);
    jobsByDate.set(dateKey, existing);
  }

  let totalKm = 0;

  // For each day, estimate travel between jobs
  for (const dayJobs of jobsByDate.values()) {
    for (let i = 1; i < dayJobs.length; i++) {
      const prev = dayJobs[i - 1];
      const curr = dayJobs[i];

      if (prev.site.latitude && prev.site.longitude &&
          curr.site.latitude && curr.site.longitude) {
        totalKm += haversineDistance(
          prev.site.latitude,
          prev.site.longitude,
          curr.site.latitude,
          curr.site.longitude
        );
      } else {
        // Estimate 10km average if no coords
        totalKm += 10;
      }
    }
  }

  return totalKm;
}

/**
 * Check if an engineer is available to take more work this week
 */
export async function isEngineerAvailableForMore(
  engineerId: string,
  date: Date
): Promise<{
  available: boolean;
  reason?: string;
  currentLoad: number;
  maxLoad: number;
}> {
  const weekStart = getStartOfWeek(date);
  const weekEnd = getEndOfWeek(date);

  // Get all engineers stats
  const allStats = await getAllEngineersWeeklyStats(weekStart, weekEnd);
  const avgJobs = calculateAverage(allStats.map((s) => s.jobCount));

  // Get this engineer's stats
  const engineerStats = allStats.find((s) => s.engineerId === engineerId);
  const currentLoad = engineerStats?.jobCount ?? 0;

  // Check daily load
  const jobsToday = await countJobsOnDate(engineerId, date);

  if (jobsToday >= MAX_JOBS_PER_DAY) {
    return {
      available: false,
      reason: `Already has ${jobsToday} jobs on this day (max: ${MAX_JOBS_PER_DAY})`,
      currentLoad,
      maxLoad: MAX_JOBS_PER_DAY,
    };
  }

  // Check weekly load
  const maxWeeklyLoad = Math.ceil(avgJobs * OVERLOAD_THRESHOLD);
  if (currentLoad >= maxWeeklyLoad && avgJobs > 0) {
    return {
      available: false,
      reason: `Weekly load (${currentLoad}) exceeds threshold`,
      currentLoad,
      maxLoad: maxWeeklyLoad,
    };
  }

  return {
    available: true,
    currentLoad,
    maxLoad: MAX_JOBS_PER_DAY,
  };
}

/**
 * Get engineers sorted by capacity (most available first)
 */
export async function getEngineersByCapacity(
  date: Date
): Promise<{ engineerId: string; availableSlots: number; score: number }[]> {
  const weekStart = getStartOfWeek(date);
  const weekEnd = getEndOfWeek(date);

  // Get all approved engineers
  const engineers = await db.user.findMany({
    where: {
      role: "ENGINEER",
      engineerProfile: { status: "APPROVED" },
    },
    select: { id: true },
  });

  const results = await Promise.all(
    engineers.map(async (eng) => {
      const jobsOnDay = await countJobsOnDate(eng.id, date);
      const weeklyStats = await getAllEngineersWeeklyStats(weekStart, weekEnd);
      const engineerWeekly = weeklyStats.find((s) => s.engineerId === eng.id);
      const avgJobs = calculateAverage(weeklyStats.map((s) => s.jobCount));

      const comparedToAverage =
        avgJobs > 0 ? (engineerWeekly?.jobCount ?? 0) / avgJobs : 1;

      const { score } = calculateWorkloadScore(comparedToAverage, jobsOnDay);

      return {
        engineerId: eng.id,
        availableSlots: MAX_JOBS_PER_DAY - jobsOnDay,
        score,
      };
    })
  );

  return results
    .filter((r) => r.availableSlots > 0)
    .sort((a, b) => b.score - a.score);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Haversine distance between two points
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
