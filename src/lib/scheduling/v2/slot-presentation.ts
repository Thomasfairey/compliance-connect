/**
 * Slot Presentation Layer
 *
 * Presents scheduling options to customers with intelligent recommendations,
 * badges, and savings breakdowns.
 */

import { db } from "@/lib/db";
import { scoreSlotAllocation, getTopFactors } from "./scorer";
import { getViableSlots } from "./allocator";
import { calculatePrice } from "./pricing-engine";
import type {
  SlotPresentation,
  PresentedSlot,
  SlotBadge,
  SavingsBreakdown,
  FlexibilityPrompt,
  BookingRequest,
  ScheduleSlot,
  EngineerWithProfile,
  CUSTOMER_FOCUSED_WEIGHTS,
} from "./types";

// =============================================================================
// MAIN PRESENTATION FUNCTION
// =============================================================================

/**
 * Present slots to customer with recommendations and badges
 */
export async function presentSlotsToCustomer(
  booking: BookingRequest,
  options: {
    maxSlots?: number;
    includeFlexibilityPrompt?: boolean;
  } = {}
): Promise<SlotPresentation> {
  const { maxSlots = 4, includeFlexibilityPrompt = true } = options;

  // Get customer info
  const customer = await db.user.findUnique({
    where: { id: booking.customerId },
    include: { customerMetrics: true },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  // Get viable slots
  const allSlots = await getViableSlots(booking, { maxSlots: 20 });

  if (allSlots.length === 0) {
    throw new Error("No available slots found");
  }

  // Get engineers for scoring
  const engineerMap = await getEngineersMap(allSlots);

  // Score each slot with customer-focused weights
  const scoredSlots = await Promise.all(
    allSlots.map(async (slot) => {
      const engineer = engineerMap.get(slot.engineerId);
      if (!engineer) return null;

      // Score with customer-focused weights
      const score = await scoreSlotAllocation(
        slot,
        booking,
        engineer,
        { customer: 0.5, engineer: 0.25, platform: 0.25 }
      );

      // Calculate pricing
      const service = await db.service.findUnique({
        where: { id: booking.serviceId },
      });

      const pricing = await calculatePrice({
        booking,
        slot,
        engineer,
        customer: {
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName ?? undefined,
          metrics: customer.customerMetrics ?? undefined,
        },
        nearbyBookings: [],
        basePrice: slot.estimatedPrice,
        service: service!,
      });

      return { slot, score, pricing, engineer };
    })
  );

  // Filter out nulls and sort by customer score
  const validSlots = scoredSlots
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.score.customerScore - a.score.customerScore);

  // Assign badges
  const withBadges = assignBadges(validSlots);

  // Build presented slots
  const presentedSlots = await Promise.all(
    withBadges.slice(0, maxSlots).map((s) => buildPresentedSlot(s))
  );

  // Calculate savings
  const savings = calculateSavingsBreakdown(presentedSlots);

  // Generate flexibility prompt
  let flexibility: FlexibilityPrompt = { showPrompt: false };
  if (includeFlexibilityPrompt && booking.flexibility !== "flexible_week") {
    flexibility = await generateFlexibilityPrompt(booking, validSlots);
  }

  return {
    recommended: presentedSlots[0],
    alternatives: presentedSlots.slice(1),
    savings,
    flexibility,
  };
}

// =============================================================================
// BADGE ASSIGNMENT
// =============================================================================

interface ScoredSlotWithBadges {
  slot: ScheduleSlot;
  score: Awaited<ReturnType<typeof scoreSlotAllocation>>;
  pricing: Awaited<ReturnType<typeof calculatePrice>>;
  engineer: EngineerWithProfile;
  badges: SlotBadge[];
}

/**
 * Assign badges to slots based on their characteristics
 */
function assignBadges(
  slots: Array<{
    slot: ScheduleSlot;
    score: Awaited<ReturnType<typeof scoreSlotAllocation>>;
    pricing: Awaited<ReturnType<typeof calculatePrice>>;
    engineer: EngineerWithProfile;
  }>
): ScoredSlotWithBadges[] {
  if (slots.length === 0) return [];

  const result: ScoredSlotWithBadges[] = slots.map((s) => ({
    ...s,
    badges: [],
  }));

  // BEST_VALUE - highest customer score (first slot after sorting)
  result[0].badges.push({
    type: "BEST_VALUE",
    label: "Best Value",
    color: "green",
  });

  // FASTEST - earliest available date
  const earliest = result.reduce((min, s) =>
    s.slot.date < min.slot.date ? s : min
  );
  if (earliest !== result[0]) {
    earliest.badges.push({
      type: "FASTEST",
      label: "Earliest Available",
      color: "blue",
    });
  }

  // TOP_RATED - highest engineer rating (using experience as proxy)
  const topRated = result.reduce((max, s) => {
    const maxExp = max.engineer.profile.yearsExperience;
    const currExp = s.engineer.profile.yearsExperience;
    return currExp > maxExp ? s : max;
  });
  if (topRated.engineer.profile.yearsExperience >= 5) {
    topRated.badges.push({
      type: "TOP_RATED",
      label: "Top Rated",
      color: "gold",
    });
  }

  // CLUSTER_DISCOUNT - slots with cluster savings
  for (const slot of result) {
    if (slot.pricing.effectiveDiscountPercent >= 5) {
      slot.badges.push({
        type: "CLUSTER_DISCOUNT",
        label: `${Math.round(slot.pricing.effectiveDiscountPercent)}% Off`,
        color: "purple",
      });
    }
  }

  // ECO_FRIENDLY - slots with low travel (high travel efficiency)
  const ecoFriendly = result.find((s) => {
    const travelFactor = s.score.factors.find((f) => f.id === "travel_efficiency");
    return travelFactor && travelFactor.normalizedScore >= 90;
  });
  if (ecoFriendly && !ecoFriendly.badges.some((b) => b.type === "BEST_VALUE")) {
    ecoFriendly.badges.push({
      type: "ECO_FRIENDLY",
      label: "Low Carbon",
      color: "teal",
    });
  }

  return result;
}

// =============================================================================
// PRESENTED SLOT BUILDING
// =============================================================================

/**
 * Build a customer-facing slot presentation
 */
async function buildPresentedSlot(
  slot: ScoredSlotWithBadges
): Promise<PresentedSlot> {
  // Get engineer details
  const completedJobs = await db.booking.count({
    where: {
      engineerId: slot.engineer.user.id,
      status: "COMPLETED",
    },
  });

  // Build explanation from top factors
  const { strengths } = getTopFactors(slot.score);
  const explanation = strengths.length > 0
    ? strengths.map((f) => f.explanation).filter(Boolean).join(". ")
    : "Good match for your requirements";

  return {
    slot: slot.slot,
    engineer: {
      name: slot.engineer.user.name,
      rating: 4.5, // TODO: Calculate from actual ratings
      jobsCompleted: completedJobs,
      yearsExperience: slot.engineer.profile.yearsExperience,
    },
    price: slot.pricing.finalPrice,
    originalPrice: slot.pricing.basePrice,
    discountAmount: slot.pricing.totalDiscount,
    badges: slot.badges,
    explanation,
  };
}

// =============================================================================
// SAVINGS BREAKDOWN
// =============================================================================

/**
 * Calculate total savings breakdown
 */
function calculateSavingsBreakdown(
  slots: PresentedSlot[]
): SavingsBreakdown {
  if (slots.length === 0) {
    return {
      totalSavings: 0,
      clusterSavings: 0,
      flexSavings: 0,
      otherSavings: 0,
      explanation: "No slots available",
    };
  }

  const recommended = slots[0];
  const totalSavings = recommended.originalPrice - recommended.price;

  // Estimate breakdown (would be more accurate with full adjustment tracking)
  const clusterSavings = recommended.badges.some((b) => b.type === "CLUSTER_DISCOUNT")
    ? totalSavings * 0.6
    : 0;
  const flexSavings = totalSavings * 0.2;
  const otherSavings = totalSavings - clusterSavings - flexSavings;

  let explanation: string;
  if (totalSavings > 0) {
    explanation = `Save £${totalSavings.toFixed(2)} on your booking`;
    if (clusterSavings > 0) {
      explanation += ` (includes cluster discount)`;
    }
  } else {
    explanation = "Best available pricing";
  }

  return {
    totalSavings: Math.round(totalSavings * 100) / 100,
    clusterSavings: Math.round(clusterSavings * 100) / 100,
    flexSavings: Math.round(flexSavings * 100) / 100,
    otherSavings: Math.round(otherSavings * 100) / 100,
    explanation,
  };
}

// =============================================================================
// FLEXIBILITY PROMPT
// =============================================================================

/**
 * Generate flexibility prompt showing potential savings
 */
async function generateFlexibilityPrompt(
  booking: BookingRequest,
  scoredSlots: Array<{
    slot: ScheduleSlot;
    pricing: Awaited<ReturnType<typeof calculatePrice>>;
  }>
): Promise<FlexibilityPrompt> {
  // Find cheapest slot
  const cheapest = scoredSlots.reduce((min, s) =>
    s.pricing.finalPrice < min.pricing.finalPrice ? s : min
  );

  // Find slot matching preferred date
  const preferred = booking.preferredDate
    ? scoredSlots.find(
        (s) =>
          s.slot.date.toDateString() === booking.preferredDate?.toDateString()
      )
    : scoredSlots[0];

  if (!preferred || !cheapest) {
    return { showPrompt: false };
  }

  const potentialSavings = preferred.pricing.finalPrice - cheapest.pricing.finalPrice;

  // Only show prompt if savings are significant (> 10%)
  if (potentialSavings / preferred.pricing.finalPrice < 0.1) {
    return { showPrompt: false };
  }

  return {
    showPrompt: true,
    message: `Be flexible with your date and save £${potentialSavings.toFixed(2)}`,
    potentialSavings,
    alternativeDate: cheapest.slot.date,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get engineers map for quick lookup
 */
async function getEngineersMap(
  slots: ScheduleSlot[]
): Promise<Map<string, EngineerWithProfile>> {
  const engineerIds = [...new Set(slots.map((s) => s.engineerId))];

  const engineers = await db.user.findMany({
    where: { id: { in: engineerIds } },
    include: {
      engineerProfile: {
        include: {
          competencies: true,
          coverageAreas: true,
          qualifications: true,
        },
      },
    },
  });

  const map = new Map<string, EngineerWithProfile>();

  for (const eng of engineers) {
    if (!eng.engineerProfile) continue;

    map.set(eng.id, {
      user: eng,
      profile: eng.engineerProfile,
      coverageAreas: eng.engineerProfile.coverageAreas,
      competencies: eng.engineerProfile.competencies,
      qualifications: eng.engineerProfile.qualifications,
      basePostcode:
        eng.engineerProfile.coverageAreas[0]?.postcodePrefix + "1 1AA" || "EC1A 1AA",
      preferredRadiusKm: eng.engineerProfile.coverageAreas[0]?.radiusKm || 20,
    });
  }

  return map;
}

// =============================================================================
// DEMO DISPLAY
// =============================================================================

/**
 * Generate demo display for the scoring breakdown
 * (Used in admin dashboard or demo mode)
 */
export function generateScoreDisplay(
  score: Awaited<ReturnType<typeof scoreSlotAllocation>>
): string {
  const lines: string[] = [
    `┌${"─".repeat(56)}┐`,
    `│ SLOT SCORE: ${score.compositeScore.toFixed(0)}/100${" ".repeat(40)}│`,
    `├${"─".repeat(56)}┤`,
    `│ CUSTOMER (${(score.weights.customer * 100).toFixed(0)}%)${" ".repeat(44)}│`,
  ];

  // Customer factors
  const customerFactors = score.factors.filter((f) => f.party === "customer");
  for (const factor of customerFactors) {
    const check = factor.normalizedScore >= 70 ? "✓" : factor.normalizedScore >= 40 ? "○" : "✗";
    const line = `│  ${check} ${factor.name}: ${factor.normalizedScore.toFixed(0)}/100`;
    lines.push(line.padEnd(57) + "│");
  }

  lines.push(`├${"─".repeat(56)}┤`);
  lines.push(`│ ENGINEER (${(score.weights.engineer * 100).toFixed(0)}%)${" ".repeat(44)}│`);

  // Engineer factors
  const engineerFactors = score.factors.filter((f) => f.party === "engineer");
  for (const factor of engineerFactors) {
    const check = factor.normalizedScore >= 70 ? "✓" : factor.normalizedScore >= 40 ? "○" : "✗";
    const line = `│  ${check} ${factor.name}: ${factor.normalizedScore.toFixed(0)}/100`;
    lines.push(line.padEnd(57) + "│");
  }

  lines.push(`├${"─".repeat(56)}┤`);
  lines.push(`│ PLATFORM (${(score.weights.platform * 100).toFixed(0)}%)${" ".repeat(44)}│`);

  // Platform factors
  const platformFactors = score.factors.filter((f) => f.party === "platform");
  for (const factor of platformFactors) {
    const check = factor.normalizedScore >= 70 ? "✓" : factor.normalizedScore >= 40 ? "○" : "✗";
    const line = `│  ${check} ${factor.name}: ${factor.normalizedScore.toFixed(0)}/100`;
    lines.push(line.padEnd(57) + "│");
  }

  lines.push(`└${"─".repeat(56)}┘`);

  return lines.join("\n");
}
