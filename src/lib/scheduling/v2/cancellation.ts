/**
 * Cancellation Risk Predictor
 *
 * Predicts the probability of a booking being cancelled
 * based on historical patterns and booking characteristics.
 */

import { db } from "@/lib/db";
import type {
  CancellationRisk,
  RiskFactor,
  BookingRequest,
  ScheduleSlot,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base historical cancellation rate (will be calculated from data) */
const DEFAULT_BASE_RATE = 0.08; // 8%

/** Risk thresholds */
const LOW_RISK_THRESHOLD = 0.1;
const HIGH_RISK_THRESHOLD = 0.25;

/** Impact multipliers for prepaid bookings */
const PREPAID_RISK_REDUCTION = 0.7; // 70% reduction

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Predict cancellation risk for a booking
 */
export async function predictCancellationRisk(
  booking: BookingRequest,
  slot: ScheduleSlot
): Promise<CancellationRisk> {
  const factors: RiskFactor[] = [];

  // Get base cancellation rate
  const baseRate = await getHistoricalCancellationRate();
  let probability = baseRate;

  // 1. Customer history
  const customerImpact = await analyzeCustomerHistory(booking.customerId);
  if (customerImpact) {
    probability += customerImpact.impact;
    factors.push(customerImpact);
  }

  // 2. Booking lead time
  const leadTimeImpact = analyzeLeadTime(slot.date);
  probability += leadTimeImpact.impact;
  factors.push(leadTimeImpact);

  // 3. Day of week
  const dayImpact = await analyzeDayOfWeek(slot.date, baseRate);
  if (dayImpact) {
    probability += dayImpact.impact;
    factors.push(dayImpact);
  }

  // 4. Service type
  const serviceImpact = await analyzeServiceType(booking.serviceId, baseRate);
  if (serviceImpact) {
    probability += serviceImpact.impact;
    factors.push(serviceImpact);
  }

  // 5. Time slot (AM vs PM)
  const slotImpact = await analyzeTimeSlot(slot.slot, baseRate);
  if (slotImpact) {
    probability += slotImpact.impact;
    factors.push(slotImpact);
  }

  // 6. Site history
  const siteImpact = await analyzeSiteHistory(booking.siteId);
  if (siteImpact) {
    probability += siteImpact.impact;
    factors.push(siteImpact);
  }

  // Cap probability
  probability = Math.max(0, Math.min(0.8, probability));

  // Calculate normalized score (higher = lower risk = better)
  const score = Math.round((1 - probability) * 100);

  // Determine risk tier
  const tier = getTier(probability);

  // Generate mitigations
  const mitigations = generateMitigations(probability, factors, booking);

  return {
    probability: Math.round(probability * 1000) / 1000,
    score,
    factors,
    mitigations,
    tier,
  };
}

/**
 * Get risk tier
 */
function getTier(probability: number): "low" | "medium" | "high" {
  if (probability <= LOW_RISK_THRESHOLD) return "low";
  if (probability >= HIGH_RISK_THRESHOLD) return "high";
  return "medium";
}

// =============================================================================
// FACTOR ANALYSIS
// =============================================================================

/**
 * Get historical cancellation rate
 */
export async function getHistoricalCancellationRate(): Promise<number> {
  const [total, cancelled] = await Promise.all([
    db.booking.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
    }),
    db.booking.count({
      where: {
        status: "CANCELLED",
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  if (total === 0) return DEFAULT_BASE_RATE;
  return cancelled / total;
}

/**
 * Analyze customer's booking history
 */
async function analyzeCustomerHistory(
  customerId: string
): Promise<RiskFactor | null> {
  const [total, cancelled] = await Promise.all([
    db.booking.count({ where: { customerId } }),
    db.booking.count({
      where: { customerId, status: "CANCELLED" },
    }),
  ]);

  if (total === 0) {
    // New customer - slight risk premium
    return {
      name: "New customer",
      impact: 0.05,
      value: "first booking",
    };
  }

  const cancellationRate = cancelled / total;

  if (cancellationRate > 0.2) {
    // High-cancellation customer
    return {
      name: "High-cancellation customer",
      impact: 0.15,
      value: `${Math.round(cancellationRate * 100)}% cancellation rate`,
    };
  }

  if (cancellationRate < 0.05 && total > 5) {
    // Reliable customer with history
    return {
      name: "Reliable customer",
      impact: -0.05,
      value: `${total} bookings, ${Math.round(cancellationRate * 100)}% cancellation`,
    };
  }

  return null; // Neutral
}

/**
 * Analyze booking lead time
 */
function analyzeLeadTime(slotDate: Date): RiskFactor {
  const now = new Date();
  const daysUntil = Math.ceil(
    (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil > 14) {
    // Far future = higher cancellation risk
    return {
      name: "Long lead time",
      impact: 0.08,
      value: `${daysUntil} days`,
    };
  }

  if (daysUntil > 7) {
    // Medium lead time
    return {
      name: "Medium lead time",
      impact: 0.03,
      value: `${daysUntil} days`,
    };
  }

  if (daysUntil < 3) {
    // Imminent = very low cancellation
    return {
      name: "Imminent booking",
      impact: -0.08,
      value: `${daysUntil} days`,
    };
  }

  // Optimal range (3-7 days)
  return {
    name: "Standard lead time",
    impact: 0,
    value: `${daysUntil} days`,
  };
}

/**
 * Analyze day of week cancellation patterns
 */
async function analyzeDayOfWeek(
  date: Date,
  baseRate: number
): Promise<RiskFactor | null> {
  const dayOfWeek = date.getDay();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Get cancellation rate for this day
  const dayRate = await getDayCancellationRate(dayOfWeek);

  if (dayRate > baseRate * 1.2) {
    const impact = (dayRate - baseRate) * 0.5;
    return {
      name: "High-cancellation day",
      impact,
      value: dayNames[dayOfWeek],
    };
  }

  if (dayRate < baseRate * 0.8) {
    const impact = (dayRate - baseRate) * 0.5;
    return {
      name: "Low-cancellation day",
      impact,
      value: dayNames[dayOfWeek],
    };
  }

  return null;
}

/**
 * Get cancellation rate for a specific day of week
 */
async function getDayCancellationRate(dayOfWeek: number): Promise<number> {
  // This would ideally use SQL day-of-week functions
  // For now, we'll query all recent bookings and filter
  const bookings = await db.booking.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      scheduledDate: true,
      status: true,
    },
  });

  const dayBookings = bookings.filter(
    (b) => b.scheduledDate.getDay() === dayOfWeek
  );

  if (dayBookings.length === 0) return DEFAULT_BASE_RATE;

  const cancelled = dayBookings.filter((b) => b.status === "CANCELLED").length;
  return cancelled / dayBookings.length;
}

/**
 * Analyze service type cancellation patterns
 */
async function analyzeServiceType(
  serviceId: string,
  baseRate: number
): Promise<RiskFactor | null> {
  const [total, cancelled] = await Promise.all([
    db.booking.count({
      where: {
        serviceId,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.booking.count({
      where: {
        serviceId,
        status: "CANCELLED",
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (total < 10) return null; // Not enough data

  const serviceRate = cancelled / total;

  if (serviceRate > baseRate * 1.3) {
    // Get service name for the message
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { name: true },
    });

    return {
      name: "High-cancellation service",
      impact: (serviceRate - baseRate) * 0.3,
      value: service?.name ?? "Unknown service",
    };
  }

  return null;
}

/**
 * Analyze time slot cancellation patterns
 */
async function analyzeTimeSlot(
  slot: string,
  baseRate: number
): Promise<RiskFactor | null> {
  const [total, cancelled] = await Promise.all([
    db.booking.count({
      where: {
        slot,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.booking.count({
      where: {
        slot,
        status: "CANCELLED",
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (total < 20) return null; // Not enough data

  const slotRate = cancelled / total;

  if (Math.abs(slotRate - baseRate) > 0.03) {
    const impact = (slotRate - baseRate) * 0.2;
    return {
      name: slotRate > baseRate ? "Higher-risk time slot" : "Lower-risk time slot",
      impact,
      value: slot,
    };
  }

  return null;
}

/**
 * Analyze site-specific history
 */
async function analyzeSiteHistory(siteId: string): Promise<RiskFactor | null> {
  const [total, cancelled] = await Promise.all([
    db.booking.count({ where: { siteId } }),
    db.booking.count({ where: { siteId, status: "CANCELLED" } }),
  ]);

  if (total < 3) return null; // Not enough history

  const siteRate = cancelled / total;

  if (siteRate > 0.25) {
    return {
      name: "High-cancellation site",
      impact: 0.1,
      value: `${Math.round(siteRate * 100)}% site cancellation rate`,
    };
  }

  if (siteRate === 0 && total >= 5) {
    return {
      name: "Reliable site",
      impact: -0.03,
      value: `${total} bookings, no cancellations`,
    };
  }

  return null;
}

// =============================================================================
// MITIGATIONS
// =============================================================================

/**
 * Generate mitigation suggestions for high-risk bookings
 */
function generateMitigations(
  probability: number,
  factors: RiskFactor[],
  booking: BookingRequest
): string[] {
  const mitigations: string[] = [];

  if (probability <= LOW_RISK_THRESHOLD) {
    return []; // Low risk, no mitigations needed
  }

  // Check for specific risk factors and suggest mitigations
  const hasHighCustomerRisk = factors.some(
    (f) => f.name === "High-cancellation customer"
  );
  const hasLongLeadTime = factors.some((f) => f.name === "Long lead time");
  const isNewCustomer = factors.some((f) => f.name === "New customer");

  // Always suggest deposit for medium/high risk
  if (probability > LOW_RISK_THRESHOLD) {
    mitigations.push("Require deposit or prepayment");
  }

  // Lead time specific
  if (hasLongLeadTime) {
    mitigations.push("Send reminder 48 hours before");
    mitigations.push("Confirm booking 1 week before");
  }

  // High-cancellation customer
  if (hasHighCustomerRisk) {
    mitigations.push("Call to confirm 24 hours before");
    mitigations.push("Require full prepayment");
  }

  // New customer
  if (isNewCustomer) {
    mitigations.push("Send welcome email with booking details");
    mitigations.push("Follow up call to introduce service");
  }

  // Very high risk
  if (probability >= HIGH_RISK_THRESHOLD) {
    mitigations.push("Consider overbooking protection");
    mitigations.push("Have standby customer for this slot");
  }

  return mitigations;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Adjust risk for prepaid bookings
 */
export function adjustRiskForPayment(
  risk: CancellationRisk,
  isPrepaid: boolean
): CancellationRisk {
  if (!isPrepaid) return risk;

  // Prepaid bookings have significantly lower cancellation risk
  const adjustedProbability = risk.probability * (1 - PREPAID_RISK_REDUCTION);
  const adjustedScore = Math.round((1 - adjustedProbability) * 100);

  return {
    ...risk,
    probability: adjustedProbability,
    score: adjustedScore,
    tier: getTier(adjustedProbability),
    factors: [
      ...risk.factors,
      {
        name: "Prepaid booking",
        impact: -(risk.probability * PREPAID_RISK_REDUCTION),
        value: "prepaid",
      },
    ],
    mitigations: [], // No mitigations needed for prepaid
  };
}

/**
 * Get cancellation risk summary for a date range
 */
export async function getCancellationRiskSummary(
  startDate: Date,
  endDate: Date
): Promise<{
  totalBookings: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  avgProbability: number;
}> {
  const bookings = await db.booking.findMany({
    where: {
      scheduledDate: { gte: startDate, lte: endDate },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    select: {
      id: true,
      customerId: true,
      siteId: true,
      serviceId: true,
      scheduledDate: true,
      slot: true,
    },
  });

  let lowRisk = 0;
  let mediumRisk = 0;
  let highRisk = 0;
  let totalProbability = 0;

  for (const booking of bookings) {
    const risk = await predictCancellationRisk(
      {
        customerId: booking.customerId,
        siteId: booking.siteId,
        serviceId: booking.serviceId,
        estimatedQty: 1,
      },
      {
        id: booking.id,
        date: booking.scheduledDate,
        slot: booking.slot as "AM" | "PM",
        startTime: booking.slot === "AM" ? "09:00" : "13:00",
        endTime: booking.slot === "AM" ? "12:00" : "17:00",
        engineerId: "",
        estimatedPrice: 0,
        estimatedDuration: 60,
        isClusterOpportunity: false,
        nearbyJobCount: 0,
      }
    );

    totalProbability += risk.probability;

    if (risk.tier === "low") lowRisk++;
    else if (risk.tier === "high") highRisk++;
    else mediumRisk++;
  }

  return {
    totalBookings: bookings.length,
    lowRisk,
    mediumRisk,
    highRisk,
    avgProbability:
      bookings.length > 0 ? totalProbability / bookings.length : 0,
  };
}
