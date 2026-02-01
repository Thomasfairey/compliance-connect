/**
 * Multi-Objective Scorer
 *
 * The core scoring engine that evaluates slot allocations across
 * all three parties: Customer, Engineer, and Platform.
 *
 * This implements the "moat" - the scheduling intelligence that
 * competitors using manual phone/email booking cannot replicate.
 */

import { db } from "@/lib/db";
import { calculateTravelEfficiency } from "./travel";
import { calculateRouteContinuity } from "./route";
import { calculateWorkloadBalance } from "./workload";
import { calculateNetworkEffect } from "./network";
import { predictCancellationRisk } from "./cancellation";
import { getCustomerLTV } from "./customer-metrics";
import type {
  SlotScore,
  ScoreFactor,
  ScoringWeights,
  BookingRequest,
  ScheduleSlot,
  EngineerWithProfile,
  DEFAULT_SCORING_WEIGHTS,
} from "./types";

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Score a slot allocation across all three parties
 *
 * This is the heart of the scheduling intelligence system.
 * It evaluates 13 factors across Customer, Engineer, and Platform
 * to produce a composite score that optimizes for all parties.
 */
export async function scoreSlotAllocation(
  slot: ScheduleSlot,
  booking: BookingRequest,
  engineer: EngineerWithProfile,
  weights: ScoringWeights = { customer: 0.4, engineer: 0.3, platform: 0.3 }
): Promise<SlotScore> {
  const factors: ScoreFactor[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER FACTORS (4 factors)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Time Match - How close to their preferred time?
  const timeMatch = calculateTimeMatch(slot, booking);
  factors.push({
    id: "time_match",
    name: "Time Match",
    party: "customer",
    rawValue: timeMatch.matchPercent,
    rawUnit: "%",
    normalizedScore: timeMatch.matchPercent,
    weight: 0.25,
    contribution: timeMatch.matchPercent * 0.25,
    explanation: timeMatch.explanation,
  });

  // 2. Wait Time - Days until slot
  const waitTime = calculateWaitTime(slot.date);
  factors.push({
    id: "wait_time",
    name: "Wait Time",
    party: "customer",
    rawValue: waitTime.days,
    rawUnit: "days",
    normalizedScore: waitTime.score,
    weight: 0.25,
    contribution: waitTime.score * 0.25,
    explanation: waitTime.explanation,
  });

  // 3. Engineer Quality - Rating and experience
  const engineerQuality = await calculateEngineerQuality(engineer, booking.serviceId);
  factors.push({
    id: "engineer_quality",
    name: "Engineer Quality",
    party: "customer",
    rawValue: engineerQuality.rating,
    rawUnit: "★",
    normalizedScore: engineerQuality.score,
    weight: 0.30,
    contribution: engineerQuality.score * 0.30,
    explanation: engineerQuality.explanation,
  });

  // 4. Price Fit - How well does price match expectations?
  const priceFit = calculatePriceFit(slot.estimatedPrice, booking);
  factors.push({
    id: "price_fit",
    name: "Price Fit",
    party: "customer",
    rawValue: slot.estimatedPrice,
    rawUnit: "£",
    normalizedScore: priceFit.score,
    weight: 0.20,
    contribution: priceFit.score * 0.20,
    explanation: priceFit.explanation,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINEER FACTORS (4 factors)
  // ═══════════════════════════════════════════════════════════════════════════

  // 5. Travel Efficiency - Distance from previous job
  const site = await db.site.findUnique({
    where: { id: booking.siteId },
    select: { postcode: true },
  });
  const travelEfficiency = await calculateTravelEfficiency(
    engineer,
    slot.date,
    site?.postcode ?? ""
  );
  factors.push({
    id: "travel_efficiency",
    name: "Travel Efficiency",
    party: "engineer",
    rawValue: travelEfficiency.distanceKm,
    rawUnit: "km",
    normalizedScore: travelEfficiency.efficiencyScore,
    weight: 0.35,
    contribution: travelEfficiency.efficiencyScore * 0.35,
    explanation: `${travelEfficiency.distanceKm}km travel (${travelEfficiency.routeContext})`,
  });

  // 6. Earnings per Hour - Effective hourly rate
  const earnings = calculateEarningsPerHour(
    slot.estimatedPrice,
    slot.estimatedDuration,
    travelEfficiency.travelMinutes,
    engineer
  );
  factors.push({
    id: "earnings_per_hour",
    name: "Earnings/Hour",
    party: "engineer",
    rawValue: earnings.effectiveHourlyRate,
    rawUnit: "£/hr",
    normalizedScore: earnings.score,
    weight: 0.30,
    contribution: earnings.score * 0.30,
    explanation: earnings.explanation,
  });

  // 7. Route Continuity - Does this fit the existing route?
  const routeContinuity = await calculateRouteContinuity(
    engineer,
    slot.date,
    site?.postcode ?? "",
    slot.slot
  );
  factors.push({
    id: "route_continuity",
    name: "Route Continuity",
    party: "engineer",
    rawValue: routeContinuity.insertionCost,
    rawUnit: "km detour",
    normalizedScore: routeContinuity.score,
    weight: 0.20,
    contribution: routeContinuity.score * 0.20,
    explanation: `${routeContinuity.insertionCost.toFixed(1)}km insertion cost`,
  });

  // 8. Workload Balance - Is this engineer overloaded?
  const workloadBalance = await calculateWorkloadBalance(engineer, slot.date);
  factors.push({
    id: "workload_balance",
    name: "Workload Balance",
    party: "engineer",
    rawValue: workloadBalance.comparedToAverage,
    rawUnit: "x avg",
    normalizedScore: workloadBalance.score,
    weight: 0.15,
    contribution: workloadBalance.score * 0.15,
    explanation: workloadBalance.isOverloaded
      ? "Overloaded - needs relief"
      : workloadBalance.isUnderloaded
        ? "Underloaded - needs work"
        : "Balanced workload",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM FACTORS (5 factors)
  // ═══════════════════════════════════════════════════════════════════════════

  // 9. Margin - Revenue minus costs
  const margin = calculateMargin(
    slot.estimatedPrice,
    slot.estimatedDuration,
    engineer
  );
  factors.push({
    id: "margin",
    name: "Margin",
    party: "platform",
    rawValue: margin.marginPercent,
    rawUnit: "%",
    normalizedScore: margin.score,
    weight: 0.25,
    contribution: margin.score * 0.25,
    explanation: `${margin.marginPercent.toFixed(1)}% margin`,
  });

  // 10. Utilization Value - Filling gaps is valuable
  const utilization = calculateUtilizationValue(slot, workloadBalance);
  factors.push({
    id: "utilization_value",
    name: "Utilization Value",
    party: "platform",
    rawValue: utilization.gapFillValue,
    rawUnit: "",
    normalizedScore: utilization.score,
    weight: 0.25,
    contribution: utilization.score * 0.25,
    explanation: utilization.explanation,
  });

  // 11. Customer LTV - Prioritize high-value customers
  const customerLTV = await getCustomerLTV(booking.customerId);
  factors.push({
    id: "customer_ltv",
    name: "Customer LTV",
    party: "platform",
    rawValue: customerLTV.totalRevenue,
    rawUnit: "£ lifetime",
    normalizedScore: customerLTV.score,
    weight: 0.20,
    contribution: customerLTV.score * 0.20,
    explanation: `£${customerLTV.totalRevenue.toFixed(0)} lifetime value`,
  });

  // 12. Network Effect - Future booking potential
  const networkEffect = await calculateNetworkEffect(site?.postcode ?? "", slot.date);
  factors.push({
    id: "network_effect",
    name: "Network Effect",
    party: "platform",
    rawValue: networkEffect.futureBookingPotential,
    rawUnit: "potential",
    normalizedScore: networkEffect.score,
    weight: 0.15,
    contribution: networkEffect.score * 0.15,
    explanation: networkEffect.isNewArea
      ? "New area - strategic value"
      : `${networkEffect.postcodeDistrict} area`,
  });

  // 13. Cancellation Risk - Lower is better
  const cancellationRisk = await predictCancellationRisk(booking, slot);
  factors.push({
    id: "cancellation_risk",
    name: "Cancellation Risk",
    party: "platform",
    rawValue: cancellationRisk.probability,
    rawUnit: "probability",
    normalizedScore: cancellationRisk.score,
    weight: 0.15,
    contribution: cancellationRisk.score * 0.15,
    explanation: `${cancellationRisk.tier} risk (${(cancellationRisk.probability * 100).toFixed(0)}%)`,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATE SCORES
  // ═══════════════════════════════════════════════════════════════════════════

  const customerScore = factors
    .filter((f) => f.party === "customer")
    .reduce((sum, f) => sum + f.contribution, 0);

  const engineerScore = factors
    .filter((f) => f.party === "engineer")
    .reduce((sum, f) => sum + f.contribution, 0);

  const platformScore = factors
    .filter((f) => f.party === "platform")
    .reduce((sum, f) => sum + f.contribution, 0);

  // Weighted composite
  const compositeScore =
    customerScore * weights.customer +
    engineerScore * weights.engineer +
    platformScore * weights.platform;

  return {
    customerScore: Math.round(customerScore * 100) / 100,
    engineerScore: Math.round(engineerScore * 100) / 100,
    platformScore: Math.round(platformScore * 100) / 100,
    compositeScore: Math.round(compositeScore * 100) / 100,
    weights,
    factors,
    calculatedAt: new Date(),
  };
}

// =============================================================================
// CUSTOMER FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate how well the slot matches customer's preferred time
 */
function calculateTimeMatch(
  slot: ScheduleSlot,
  booking: BookingRequest
): { matchPercent: number; explanation: string } {
  // If no preference, perfect match
  if (!booking.preferredTimes || booking.preferredTimes.length === 0) {
    return { matchPercent: 100, explanation: "No time preference specified" };
  }

  // Check if slot matches any preferred time
  if (booking.preferredTimes.includes(slot.slot)) {
    return { matchPercent: 100, explanation: `Matches preferred ${slot.slot} slot` };
  }

  // FULL_DAY matches any slot
  if (booking.preferredTimes.includes("FULL_DAY")) {
    return { matchPercent: 100, explanation: "Flexible timing" };
  }

  // No match - but check flexibility
  if (booking.flexibility === "flexible_day" || booking.flexibility === "flexible_week") {
    return { matchPercent: 70, explanation: "Different slot but customer is flexible" };
  }

  return { matchPercent: 40, explanation: "Doesn't match preferred time" };
}

/**
 * Calculate wait time score
 */
function calculateWaitTime(
  slotDate: Date
): { days: number; score: number; explanation: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Scoring: Sooner is better, but same-day might be suspicious
  // 1-2 days = 100 (excellent - fast but not rushed)
  // 3-5 days = 90-100 (very good)
  // 6-10 days = 70-90 (good)
  // 11-14 days = 50-70 (acceptable)
  // 14+ days = decreasing

  let score: number;
  let explanation: string;

  if (days <= 0) {
    score = 85;
    explanation = "Same day service";
  } else if (days <= 2) {
    score = 100;
    explanation = `${days} day${days > 1 ? "s" : ""} - fast turnaround`;
  } else if (days <= 5) {
    score = 95 - (days - 2) * 2;
    explanation = `${days} days - good availability`;
  } else if (days <= 10) {
    score = 85 - (days - 5) * 3;
    explanation = `${days} days - reasonable wait`;
  } else if (days <= 14) {
    score = 65 - (days - 10) * 4;
    explanation = `${days} days - longer wait`;
  } else {
    score = Math.max(20, 50 - (days - 14) * 2);
    explanation = `${days} days - extended wait`;
  }

  return { days, score, explanation };
}

/**
 * Calculate engineer quality score
 */
async function calculateEngineerQuality(
  engineer: EngineerWithProfile,
  serviceId: string
): Promise<{ rating: number; score: number; explanation: string }> {
  // Get engineer's rating (from completed jobs)
  // For now, use a placeholder - would come from reviews/feedback
  const rating = 4.5; // TODO: Calculate from actual ratings

  // Get experience for this service
  const competency = engineer.competencies.find((c) => c.serviceId === serviceId);
  const experienceYears = competency?.experienceYears ?? 0;

  // Count completed jobs for this service
  const completedJobs = await db.booking.count({
    where: {
      engineerId: engineer.user.id,
      serviceId,
      status: "COMPLETED",
    },
  });

  // Score components
  const ratingScore = (rating / 5) * 100;
  const experienceScore = Math.min(100, experienceYears * 15);
  const volumeScore = Math.min(100, completedJobs * 0.5);

  // Weighted combination
  const score = ratingScore * 0.5 + experienceScore * 0.3 + volumeScore * 0.2;

  return {
    rating,
    score: Math.round(score),
    explanation: `${rating}★ rating, ${experienceYears}yr experience, ${completedJobs} jobs`,
  };
}

/**
 * Calculate price fit score
 */
function calculatePriceFit(
  estimatedPrice: number,
  booking: BookingRequest
): { score: number; explanation: string } {
  // If customer indicated budget sensitivity and expected price
  if (booking.budgetSensitive && booking.expectedPrice) {
    const ratio = estimatedPrice / booking.expectedPrice;

    if (ratio <= 0.9) {
      return { score: 100, explanation: "Below budget expectation" };
    }
    if (ratio <= 1.0) {
      return { score: 95, explanation: "Within budget" };
    }
    if (ratio <= 1.1) {
      return { score: 80, explanation: "Slightly above budget" };
    }
    if (ratio <= 1.25) {
      return { score: 60, explanation: "Above budget" };
    }
    return { score: 40, explanation: "Significantly above budget" };
  }

  // No budget sensitivity - neutral score
  return { score: 80, explanation: "No budget constraint specified" };
}

// =============================================================================
// ENGINEER FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate effective earnings per hour
 */
function calculateEarningsPerHour(
  estimatedPrice: number,
  estimatedDuration: number,
  travelMinutes: number,
  engineer: EngineerWithProfile
): { effectiveHourlyRate: number; score: number; explanation: string } {
  // Calculate engineer pay based on type
  let engineerPay: number;

  switch (engineer.profile.engineerType) {
    case "PAT_TESTER":
      // Assume average 20 items/hour at current rate
      const testRate = engineer.profile.testRate ?? 0.45;
      engineerPay = (estimatedDuration / 60) * 20 * testRate;
      break;
    case "ELECTRICIAN":
      // Percentage of labour
      const labourPercent = engineer.profile.labourPercentage ?? 0.4;
      engineerPay = estimatedPrice * labourPercent;
      break;
    case "CONSULTANT":
      // Day rate prorated
      const dayRate = engineer.profile.dayRate ?? 400;
      engineerPay = (estimatedDuration / 480) * dayRate; // 8-hour day
      break;
    default:
      // Default to 50% of price
      engineerPay = estimatedPrice * 0.5;
  }

  // Calculate effective hourly rate including travel
  const totalMinutes = estimatedDuration + travelMinutes;
  const effectiveHourlyRate = (engineerPay / totalMinutes) * 60;

  // Score based on hourly rate
  // £50+/hr = excellent (100)
  // £40-50/hr = very good (80-100)
  // £30-40/hr = good (60-80)
  // £20-30/hr = acceptable (40-60)
  // <£20/hr = poor (<40)

  let score: number;
  if (effectiveHourlyRate >= 50) {
    score = 100;
  } else if (effectiveHourlyRate >= 40) {
    score = 80 + ((effectiveHourlyRate - 40) / 10) * 20;
  } else if (effectiveHourlyRate >= 30) {
    score = 60 + ((effectiveHourlyRate - 30) / 10) * 20;
  } else if (effectiveHourlyRate >= 20) {
    score = 40 + ((effectiveHourlyRate - 20) / 10) * 20;
  } else {
    score = Math.max(10, effectiveHourlyRate * 2);
  }

  return {
    effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
    score: Math.round(score),
    explanation: `£${effectiveHourlyRate.toFixed(2)}/hr effective rate`,
  };
}

// =============================================================================
// PLATFORM FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate margin
 */
function calculateMargin(
  estimatedPrice: number,
  estimatedDuration: number,
  engineer: EngineerWithProfile
): { marginPercent: number; score: number } {
  // Calculate engineer cost (same logic as earnings)
  let engineerCost: number;

  switch (engineer.profile.engineerType) {
    case "PAT_TESTER":
      const testRate = engineer.profile.testRate ?? 0.45;
      engineerCost = (estimatedDuration / 60) * 20 * testRate;
      break;
    case "ELECTRICIAN":
      const labourPercent = engineer.profile.labourPercentage ?? 0.4;
      engineerCost = estimatedPrice * labourPercent;
      break;
    case "CONSULTANT":
      const dayRate = engineer.profile.dayRate ?? 400;
      engineerCost = (estimatedDuration / 480) * dayRate;
      break;
    default:
      engineerCost = estimatedPrice * 0.5;
  }

  // Platform overhead (estimated at 10%)
  const platformOverhead = estimatedPrice * 0.1;

  const margin = estimatedPrice - engineerCost - platformOverhead;
  const marginPercent = (margin / estimatedPrice) * 100;

  // Score: 30%+ margin = excellent, 20-30% = good, 10-20% = acceptable, <10% = poor
  let score: number;
  if (marginPercent >= 30) {
    score = 100;
  } else if (marginPercent >= 20) {
    score = 70 + ((marginPercent - 20) / 10) * 30;
  } else if (marginPercent >= 10) {
    score = 40 + ((marginPercent - 10) / 10) * 30;
  } else {
    score = Math.max(0, marginPercent * 4);
  }

  return {
    marginPercent: Math.round(marginPercent * 10) / 10,
    score: Math.round(score),
  };
}

/**
 * Calculate utilization value - filling gaps is valuable
 */
function calculateUtilizationValue(
  slot: ScheduleSlot,
  workloadBalance: { jobsOnDay: number; maxJobsPerDay: number }
): { gapFillValue: number; score: number; explanation: string } {
  // Value is higher when engineer has fewer jobs (filling capacity)
  const utilizationRate = workloadBalance.jobsOnDay / workloadBalance.maxJobsPerDay;

  // Filling an empty day = highest value
  // Filling a partially full day = medium value
  // Adding to an already busy day = lower value

  let gapFillValue: number;
  let score: number;
  let explanation: string;

  if (workloadBalance.jobsOnDay === 0) {
    gapFillValue = 1.0;
    score = 100;
    explanation = "Fills empty day - high utilization value";
  } else if (utilizationRate < 0.5) {
    gapFillValue = 0.8;
    score = 85;
    explanation = "Good capacity utilization";
  } else if (utilizationRate < 0.75) {
    gapFillValue = 0.6;
    score = 70;
    explanation = "Moderate capacity remaining";
  } else if (utilizationRate < 1.0) {
    gapFillValue = 0.4;
    score = 55;
    explanation = "Limited capacity remaining";
  } else {
    gapFillValue = 0.2;
    score = 40;
    explanation = "At capacity";
  }

  // Bonus for cluster opportunities
  if (slot.isClusterOpportunity && slot.nearbyJobCount > 0) {
    score = Math.min(100, score + 10);
    explanation += ` + cluster bonus`;
  }

  return { gapFillValue, score, explanation };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a human-readable summary of the score
 */
export function getScoreSummary(score: SlotScore): string {
  const rating =
    score.compositeScore >= 80
      ? "Excellent"
      : score.compositeScore >= 65
        ? "Good"
        : score.compositeScore >= 50
          ? "Acceptable"
          : "Poor";

  return `${rating} match (${score.compositeScore.toFixed(0)}/100) - ` +
    `Customer: ${score.customerScore.toFixed(0)}, ` +
    `Engineer: ${score.engineerScore.toFixed(0)}, ` +
    `Platform: ${score.platformScore.toFixed(0)}`;
}

/**
 * Get top factors (positive and negative)
 */
export function getTopFactors(score: SlotScore): {
  strengths: ScoreFactor[];
  weaknesses: ScoreFactor[];
} {
  const sorted = [...score.factors].sort(
    (a, b) => b.normalizedScore - a.normalizedScore
  );

  return {
    strengths: sorted.slice(0, 3).filter((f) => f.normalizedScore >= 70),
    weaknesses: sorted
      .slice(-3)
      .reverse()
      .filter((f) => f.normalizedScore < 50),
  };
}
