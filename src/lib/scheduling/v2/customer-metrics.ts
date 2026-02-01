/**
 * Customer Metrics Service
 *
 * Calculates and maintains customer lifetime value (LTV) and reliability
 * scores for use in scheduling decisions.
 */

import { db } from "@/lib/db";
import type { CustomerMetrics } from "@prisma/client";
import type { CustomerLTV } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Weight for revenue in LTV calculation */
const REVENUE_WEIGHT = 0.4;

/** Weight for frequency in LTV calculation */
const FREQUENCY_WEIGHT = 0.3;

/** Weight for reliability in LTV calculation */
const RELIABILITY_WEIGHT = 0.3;

/** Revenue amount for maximum score (100) */
const MAX_REVENUE_THRESHOLD = 10000;

/** Number of bookings for maximum frequency score */
const MAX_FREQUENCY_THRESHOLD = 10;

/** Default score for new customers */
const DEFAULT_SCORE = 50;

/** Recency decay factor (days after which score starts declining) */
const RECENCY_THRESHOLD_DAYS = 180;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get customer LTV data for scoring
 */
export async function getCustomerLTV(customerId: string): Promise<CustomerLTV> {
  // Try to get cached metrics
  let metrics = await db.customerMetrics.findUnique({
    where: { userId: customerId },
  });

  // If no cached metrics or stale, recalculate
  if (!metrics || isMetricsStale(metrics)) {
    metrics = await recalculateCustomerMetrics(customerId);
  }

  return {
    totalRevenue: metrics.totalRevenue,
    completedBookings: metrics.completedBookings,
    cancellationRate:
      metrics.totalBookings > 0
        ? metrics.cancelledBookings / metrics.totalBookings
        : 0,
    ltvScore: metrics.ltvScore,
    reliabilityScore: metrics.reliabilityScore,
    frequencyScore: metrics.frequencyScore,
    score: metrics.ltvScore, // Use LTV as the main score
  };
}

/**
 * Recalculate all metrics for a customer
 */
export async function recalculateCustomerMetrics(
  customerId: string
): Promise<CustomerMetrics> {
  // Get all bookings for this customer
  const bookings = await db.booking.findMany({
    where: { customerId },
    select: {
      id: true,
      status: true,
      quotedPrice: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate counts
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED").length;
  const declinedBookings = bookings.filter((b) => b.status === "DECLINED").length;

  // Calculate revenue (from completed bookings)
  const completedWithPrice = bookings.filter(
    (b) => b.status === "COMPLETED" && b.quotedPrice != null
  );
  const totalRevenue = completedWithPrice.reduce(
    (sum, b) => sum + (b.quotedPrice ?? 0),
    0
  );
  const averageOrderValue =
    completedBookings > 0 ? totalRevenue / completedBookings : 0;

  // Timeline
  const firstBookingAt = bookings.length > 0 ? bookings[0].createdAt : null;
  const lastBookingDate = completedWithPrice.length > 0
    ? completedWithPrice[completedWithPrice.length - 1].completedAt
    : null;
  const daysSinceLastBooking = lastBookingDate
    ? Math.floor(
        (Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Calculate individual scores
  const revenueScore = calculateRevenueScore(totalRevenue);
  const frequencyScore = calculateFrequencyScore(completedBookings);
  const reliabilityScore = calculateReliabilityScore(
    totalBookings,
    cancelledBookings
  );
  const recencyScore = calculateRecencyScore(daysSinceLastBooking);

  // Calculate composite LTV score
  const baseLtvScore =
    revenueScore * REVENUE_WEIGHT +
    frequencyScore * FREQUENCY_WEIGHT +
    reliabilityScore * RELIABILITY_WEIGHT;

  // Apply recency modifier
  const ltvScore = applyRecencyModifier(baseLtvScore, recencyScore);

  // Upsert metrics
  const metrics = await db.customerMetrics.upsert({
    where: { userId: customerId },
    update: {
      totalBookings,
      completedBookings,
      cancelledBookings,
      declinedBookings,
      totalRevenue,
      averageOrderValue,
      firstBookingAt,
      lastBookingAt: lastBookingDate,
      daysSinceLastBooking,
      ltvScore,
      reliabilityScore,
      frequencyScore,
      calculatedAt: new Date(),
    },
    create: {
      userId: customerId,
      totalBookings,
      completedBookings,
      cancelledBookings,
      declinedBookings,
      totalRevenue,
      averageOrderValue,
      firstBookingAt,
      lastBookingAt: lastBookingDate,
      daysSinceLastBooking,
      ltvScore,
      reliabilityScore,
      frequencyScore,
    },
  });

  return metrics;
}

// =============================================================================
// SCORE CALCULATIONS
// =============================================================================

/**
 * Calculate revenue score (0-100)
 */
function calculateRevenueScore(totalRevenue: number): number {
  if (totalRevenue <= 0) return 0;
  if (totalRevenue >= MAX_REVENUE_THRESHOLD) return 100;
  return (totalRevenue / MAX_REVENUE_THRESHOLD) * 100;
}

/**
 * Calculate frequency score (0-100)
 */
function calculateFrequencyScore(completedBookings: number): number {
  if (completedBookings <= 0) return 0;
  if (completedBookings >= MAX_FREQUENCY_THRESHOLD) return 100;
  return (completedBookings / MAX_FREQUENCY_THRESHOLD) * 100;
}

/**
 * Calculate reliability score (0-100)
 */
function calculateReliabilityScore(
  totalBookings: number,
  cancelledBookings: number
): number {
  if (totalBookings === 0) return DEFAULT_SCORE; // New customer

  const cancellationRate = cancelledBookings / totalBookings;

  // 0% cancellation = 100 score
  // 10% cancellation = 80 score
  // 30% cancellation = 40 score
  // 50%+ cancellation = 0 score

  if (cancellationRate === 0) return 100;
  if (cancellationRate <= 0.1) return 100 - cancellationRate * 200;
  if (cancellationRate <= 0.3) return 80 - (cancellationRate - 0.1) * 200;
  if (cancellationRate <= 0.5) return 40 - (cancellationRate - 0.3) * 200;
  return 0;
}

/**
 * Calculate recency score (0-100)
 */
function calculateRecencyScore(daysSinceLastBooking: number | null): number {
  if (daysSinceLastBooking === null) return DEFAULT_SCORE;

  // Recent bookings = high score
  // 0-30 days = 100
  // 30-90 days = 80-100
  // 90-180 days = 50-80
  // 180+ days = declining

  if (daysSinceLastBooking <= 30) return 100;
  if (daysSinceLastBooking <= 90) {
    return 80 + ((90 - daysSinceLastBooking) / 60) * 20;
  }
  if (daysSinceLastBooking <= RECENCY_THRESHOLD_DAYS) {
    return 50 + ((RECENCY_THRESHOLD_DAYS - daysSinceLastBooking) / 90) * 30;
  }
  // Decay after threshold
  const daysOver = daysSinceLastBooking - RECENCY_THRESHOLD_DAYS;
  return Math.max(10, 50 - daysOver * 0.1);
}

/**
 * Apply recency modifier to base score
 */
function applyRecencyModifier(baseScore: number, recencyScore: number): number {
  // Recency doesn't reduce score below a floor, but does boost it
  if (recencyScore >= 80) {
    // Recent customer - boost slightly
    return Math.min(100, baseScore * 1.05);
  }
  if (recencyScore >= 50) {
    // Normal recency - no change
    return baseScore;
  }
  // Stale customer - reduce score slightly
  return baseScore * (0.8 + recencyScore * 0.004);
}

/**
 * Check if metrics are stale (older than 24 hours)
 */
function isMetricsStale(metrics: CustomerMetrics): boolean {
  const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
  return Date.now() - metrics.calculatedAt.getTime() > staleThreshold;
}

// =============================================================================
// TRIGGER FUNCTIONS
// =============================================================================

/**
 * Update metrics after booking completion
 * Should be called when a booking status changes to COMPLETED
 */
export async function onBookingCompleted(
  bookingId: string
): Promise<CustomerMetrics | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { customerId: true },
  });

  if (!booking) return null;
  return recalculateCustomerMetrics(booking.customerId);
}

/**
 * Update metrics after booking cancellation
 * Should be called when a booking status changes to CANCELLED
 */
export async function onBookingCancelled(
  bookingId: string
): Promise<CustomerMetrics | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { customerId: true },
  });

  if (!booking) return null;
  return recalculateCustomerMetrics(booking.customerId);
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Recalculate metrics for all customers
 * Should be run as a nightly batch job
 */
export async function recalculateAllCustomerMetrics(): Promise<{
  updated: number;
  errors: string[];
}> {
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const customer of customers) {
    try {
      await recalculateCustomerMetrics(customer.id);
      updated++;
    } catch (error) {
      errors.push(`Failed to update ${customer.id}: ${error}`);
    }
  }

  return { updated, errors };
}

/**
 * Get top customers by LTV score
 */
export async function getTopCustomers(
  limit = 10
): Promise<
  {
    userId: string;
    name: string;
    companyName: string | null;
    ltvScore: number;
    totalRevenue: number;
    completedBookings: number;
  }[]
> {
  const metrics = await db.customerMetrics.findMany({
    orderBy: { ltvScore: "desc" },
    take: limit,
    include: {
      user: {
        select: { name: true, companyName: true },
      },
    },
  });

  return metrics.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    companyName: m.user.companyName,
    ltvScore: m.ltvScore,
    totalRevenue: m.totalRevenue,
    completedBookings: m.completedBookings,
  }));
}

/**
 * Get customers at risk of churning (low recency score)
 */
export async function getChurnRiskCustomers(
  limit = 20
): Promise<
  {
    userId: string;
    name: string;
    daysSinceLastBooking: number | null;
    ltvScore: number;
    totalRevenue: number;
  }[]
> {
  const metrics = await db.customerMetrics.findMany({
    where: {
      daysSinceLastBooking: { gt: 90 },
      completedBookings: { gt: 0 },
    },
    orderBy: [{ totalRevenue: "desc" }, { daysSinceLastBooking: "desc" }],
    take: limit,
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return metrics.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    daysSinceLastBooking: m.daysSinceLastBooking,
    ltvScore: m.ltvScore,
    totalRevenue: m.totalRevenue,
  }));
}

/**
 * Get unreliable customers (high cancellation rate)
 */
export async function getUnreliableCustomers(
  minBookings = 3,
  limit = 20
): Promise<
  {
    userId: string;
    name: string;
    cancellationRate: number;
    reliabilityScore: number;
    totalBookings: number;
  }[]
> {
  const metrics = await db.customerMetrics.findMany({
    where: {
      totalBookings: { gte: minBookings },
      reliabilityScore: { lt: 60 },
    },
    orderBy: { reliabilityScore: "asc" },
    take: limit,
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return metrics.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    cancellationRate:
      m.totalBookings > 0 ? m.cancelledBookings / m.totalBookings : 0,
    reliabilityScore: m.reliabilityScore,
    totalBookings: m.totalBookings,
  }));
}
