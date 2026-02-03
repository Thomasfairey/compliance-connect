/**
 * Extensible Pricing Engine
 *
 * Calculates dynamic pricing based on configurable rules stored in the database.
 * Supports cluster discounts, urgency premiums, off-peak discounts, and more.
 */

import { db } from "@/lib/db";
import type { PricingRule as PricingRuleModel, BookingStatus, Prisma } from "@prisma/client";
import {
  calculateDistance,
  lookupPostcode,
  getPostcodeDistrict,
} from "@/lib/postcodes";
import type {
  PricingContext,
  PricingAdjustment,
  PricingResult,
  PricingRuleConfig,
  PricingBreakdownItem,
} from "./types";

// =============================================================================
// TYPES
// =============================================================================

type PricingRuleCalculator = (
  context: PricingContext,
  config: PricingRuleConfig
) => Promise<PricingAdjustment | null>;

// =============================================================================
// PRICING ENGINE
// =============================================================================

/**
 * Calculate final price with all applicable rules
 */
export async function calculatePrice(
  context: PricingContext
): Promise<PricingResult> {
  const adjustments: PricingAdjustment[] = [];
  let totalDiscount = 0;
  let totalPremium = 0;

  // Get enabled rules from database
  const rules = await db.pricingRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });

  // Apply each rule
  for (const rule of rules) {
    const calculator = RULE_CALCULATORS[rule.type];
    if (!calculator) continue;

    const adjustment = await calculator(
      context,
      rule.config as PricingRuleConfig
    );

    if (adjustment) {
      adjustments.push({
        ...adjustment,
        ruleId: rule.id,
        ruleName: rule.name,
      });

      if (adjustment.type === "discount") {
        totalDiscount += adjustment.amount + (context.basePrice * adjustment.percent) / 100;
      } else {
        totalPremium += adjustment.amount + (context.basePrice * adjustment.percent) / 100;
      }
    }
  }

  // Calculate final price
  const finalPrice = Math.max(
    0,
    context.basePrice - totalDiscount + totalPremium
  );

  // Calculate effective discount percentage
  const netDiscount = totalDiscount - totalPremium;
  const effectiveDiscountPercent =
    context.basePrice > 0 ? (netDiscount / context.basePrice) * 100 : 0;

  // Build customer breakdown
  const customerBreakdown = buildCustomerBreakdown(
    context.basePrice,
    adjustments
  );

  return {
    basePrice: context.basePrice,
    adjustments,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPremium: Math.round(totalPremium * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    effectiveDiscountPercent: Math.round(effectiveDiscountPercent * 10) / 10,
    customerBreakdown,
  };
}

/**
 * Build customer-visible breakdown
 */
function buildCustomerBreakdown(
  basePrice: number,
  adjustments: PricingAdjustment[]
): PricingBreakdownItem[] {
  const items: PricingBreakdownItem[] = [
    { label: "Service price", amount: basePrice, isHighlight: false },
  ];

  // Add customer-visible adjustments
  for (const adj of adjustments) {
    if (!adj.customerVisible) continue;

    const amount = adj.amount + (basePrice * adj.percent) / 100;
    items.push({
      label: adj.reason,
      amount: adj.type === "discount" ? -amount : amount,
      isHighlight: adj.type === "discount" && amount > 0,
    });
  }

  return items;
}

// =============================================================================
// RULE CALCULATORS
// =============================================================================

const RULE_CALCULATORS: Record<string, PricingRuleCalculator> = {
  cluster: calculateClusterDiscount,
  urgency: calculateUrgencyPremium,
  offpeak: calculateOffPeakDiscount,
  flex: calculateFlexDiscount,
  loyalty: calculateLoyaltyDiscount,
  bundle: calculateBundleDiscount,
};

/**
 * Cluster Discount
 * Apply discount when engineer already has nearby jobs
 */
async function calculateClusterDiscount(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  const clusterConfig = config.cluster;
  if (!clusterConfig) return null;

  const { radiusKm = 5, minJobs = 1, discountPercent = 10 } = clusterConfig;

  // Get site location
  const site = await db.site.findUnique({
    where: { id: context.booking.siteId },
    select: { postcode: true, latitude: true, longitude: true },
  });

  if (!site) return null;

  // Get site coordinates
  let siteCoords = { lat: site.latitude, lng: site.longitude };
  if (!siteCoords.lat || !siteCoords.lng) {
    const lookup = await lookupPostcode(site.postcode);
    if (!lookup.success || !lookup.result) return null;
    siteCoords = { lat: lookup.result.latitude, lng: lookup.result.longitude };
  }

  // Count nearby jobs on the same date
  const nearbyCount = await countNearbyJobs(
    context.slot.date,
    siteCoords.lat!,
    siteCoords.lng!,
    radiusKm,
    context.engineer?.user.id
  );

  if (nearbyCount < minJobs) return null;

  // Scale discount based on number of nearby jobs
  const scaledDiscount = Math.min(
    discountPercent * 1.5,
    discountPercent + (nearbyCount - minJobs) * 2
  );

  return {
    ruleId: "",
    ruleName: "Cluster Discount",
    type: "discount",
    amount: 0,
    percent: scaledDiscount,
    reason: `${scaledDiscount}% off - engineer already in your area`,
    customerVisible: true,
  };
}

/**
 * Urgency Premium
 * Apply premium for last-minute bookings
 */
async function calculateUrgencyPremium(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  const urgencyConfig = config.urgency;
  if (!urgencyConfig) return null;

  const { daysThreshold = 2, premiumPercent = 15 } = urgencyConfig;

  const daysUntil = Math.ceil(
    (context.slot.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil > daysThreshold) return null;

  // Scale premium based on urgency
  const scaledPremium =
    daysUntil <= 1
      ? premiumPercent
      : premiumPercent * (1 - (daysUntil - 1) / daysThreshold);

  return {
    ruleId: "",
    ruleName: "Urgency Premium",
    type: "premium",
    amount: 0,
    percent: Math.round(scaledPremium),
    reason: "Priority scheduling fee",
    customerVisible: true,
  };
}

/**
 * Off-Peak Discount
 * Apply discount for slower days
 */
async function calculateOffPeakDiscount(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  const offpeakConfig = config.offpeak;
  if (!offpeakConfig) return null;

  const { days = [1, 2], discountPercent = 5 } = offpeakConfig; // Default: Mon, Tue

  const dayOfWeek = context.slot.date.getDay();

  if (!days.includes(dayOfWeek)) return null;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    ruleId: "",
    ruleName: "Off-Peak Discount",
    type: "discount",
    amount: 0,
    percent: discountPercent,
    reason: `${discountPercent}% off - ${dayNames[dayOfWeek]} discount`,
    customerVisible: true,
  };
}

/**
 * Flexible Date Discount
 * Apply discount when customer is flexible on timing
 */
async function calculateFlexDiscount(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  const flexConfig = config.flex;
  if (!flexConfig) return null;

  const { daysFlexible = 3, discountPercent = 7 } = flexConfig;

  // Check if booking was made with flexibility
  if (context.booking.flexibility !== "flexible_week") return null;

  return {
    ruleId: "",
    ruleName: "Flexibility Discount",
    type: "discount",
    amount: 0,
    percent: discountPercent,
    reason: `${discountPercent}% off - flexible scheduling`,
    customerVisible: true,
  };
}

/**
 * Loyalty Discount
 * Apply discount for repeat customers
 */
async function calculateLoyaltyDiscount(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  const loyaltyConfig = config.loyalty;
  if (!loyaltyConfig) return null;

  const { minBookings = 5, discountPercent = 5 } = loyaltyConfig;

  // Get customer booking count
  const bookingCount = await db.booking.count({
    where: {
      customerId: context.customer.id,
      status: "COMPLETED",
    },
  });

  if (bookingCount < minBookings) return null;

  // Scale discount for very loyal customers
  const tierMultiplier =
    bookingCount >= minBookings * 3 ? 2 : bookingCount >= minBookings * 2 ? 1.5 : 1;
  const scaledDiscount = Math.min(15, discountPercent * tierMultiplier);

  return {
    ruleId: "",
    ruleName: "Loyalty Discount",
    type: "discount",
    amount: 0,
    percent: scaledDiscount,
    reason: `${scaledDiscount}% loyalty discount`,
    customerVisible: true,
  };
}

/**
 * Bundle Discount
 * Already applied at bundle level, just record it
 */
async function calculateBundleDiscount(
  context: PricingContext,
  config: PricingRuleConfig
): Promise<PricingAdjustment | null> {
  // Bundle discount is handled separately during bundle purchase
  // This is just a placeholder for tracking
  return null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Count nearby jobs for cluster detection
 */
async function countNearbyJobs(
  date: Date,
  lat: number,
  lng: number,
  radiusKm: number,
  engineerId?: string
): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Build query
  const statuses: BookingStatus[] = ["CONFIRMED", "IN_PROGRESS", "EN_ROUTE", "ON_SITE"];
  const whereClause: Prisma.BookingWhereInput = {
    scheduledDate: { gte: startOfDay, lte: endOfDay },
    status: { in: statuses },
    site: {
      latitude: { not: null },
      longitude: { not: null },
    },
    ...(engineerId ? { engineerId } : {}),
  };

  const jobs = await db.booking.findMany({
    where: whereClause,
    include: {
      site: {
        select: { latitude: true, longitude: true },
      },
    },
  });

  // Count jobs within radius
  let count = 0;
  for (const job of jobs) {
    if (job.site.latitude && job.site.longitude) {
      const distance = calculateDistance(
        lat,
        lng,
        job.site.latitude,
        job.site.longitude
      );
      if (distance <= radiusKm) {
        count++;
      }
    }
  }

  return count;
}

// =============================================================================
// RULE MANAGEMENT
// =============================================================================

/**
 * Get all pricing rules
 */
export async function getAllPricingRules(): Promise<PricingRuleModel[]> {
  return db.pricingRule.findMany({
    orderBy: [{ enabled: "desc" }, { priority: "asc" }],
  });
}

/**
 * Toggle a pricing rule
 */
export async function togglePricingRule(
  ruleId: string,
  enabled: boolean
): Promise<PricingRuleModel> {
  return db.pricingRule.update({
    where: { id: ruleId },
    data: { enabled },
  });
}

/**
 * Update rule configuration
 */
export async function updatePricingRuleConfig(
  ruleId: string,
  config: PricingRuleConfig
): Promise<PricingRuleModel> {
  return db.pricingRule.update({
    where: { id: ruleId },
    data: { config: JSON.parse(JSON.stringify(config)) },
  });
}

/**
 * Create a new pricing rule
 */
export async function createPricingRule(
  name: string,
  slug: string,
  type: string,
  config: PricingRuleConfig,
  description?: string
): Promise<PricingRuleModel> {
  // Get max priority
  const maxPriority = await db.pricingRule.aggregate({
    _max: { priority: true },
  });

  return db.pricingRule.create({
    data: {
      name,
      slug,
      type,
      config: JSON.parse(JSON.stringify(config)),
      description: description ?? null,
      priority: (maxPriority._max.priority ?? 0) + 1,
    },
  });
}

// =============================================================================
// SIMULATION
// =============================================================================

/**
 * Simulate pricing for a booking without saving
 * Useful for showing customer potential savings
 */
export async function simulatePricing(
  siteId: string,
  serviceId: string,
  date: Date,
  customerId: string
): Promise<{
  withFlexibility: PricingResult;
  withoutFlexibility: PricingResult;
  potentialSavings: number;
}> {
  // Get service base price
  const service = await db.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  // Get customer info
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, companyName: true },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const basePrice = service.basePrice;

  // Base context
  const baseContext: PricingContext = {
    booking: {
      customerId,
      siteId,
      serviceId,
      estimatedQty: 1,
    },
    slot: {
      id: "simulation",
      date,
      slot: "AM",
      startTime: "09:00",
      endTime: "12:00",
      engineerId: "",
      estimatedPrice: basePrice,
      estimatedDuration: 60,
      isClusterOpportunity: false,
      nearbyJobCount: 0,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName ?? undefined,
    },
    nearbyBookings: [],
    basePrice,
    service,
  };

  // Calculate without flexibility
  const withoutFlexibility = await calculatePrice({
    ...baseContext,
    booking: { ...baseContext.booking, flexibility: "exact" },
  });

  // Calculate with flexibility
  const withFlexibility = await calculatePrice({
    ...baseContext,
    booking: { ...baseContext.booking, flexibility: "flexible_week" },
  });

  return {
    withFlexibility,
    withoutFlexibility,
    potentialSavings: withoutFlexibility.finalPrice - withFlexibility.finalPrice,
  };
}
