/**
 * Network Effect Scorer
 *
 * Calculates the strategic value of serving a particular area,
 * considering future booking potential and market penetration.
 */

import { db } from "@/lib/db";
import { getPostcodeDistrict } from "@/lib/postcodes";
import type { NetworkEffect } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Threshold for considering an area "new" to us */
const NEW_AREA_JOB_THRESHOLD = 10;

/** Default business density estimate per district */
const DEFAULT_BUSINESS_DENSITY = 100;

/** Business profile repeat factors by area type */
const REPEAT_FACTORS: Record<string, number> = {
  office: 1.2, // Offices tend to be reliable repeat customers
  retail: 0.9, // Retail has higher turnover
  industrial: 1.1, // Industrial areas = steady work
  mixed: 1.0, // Mixed areas are average
  residential: 0.5, // Residential is mostly one-off
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate network effect score for serving a postcode
 */
export async function calculateNetworkEffect(
  postcode: string,
  date: Date
): Promise<NetworkEffect> {
  const postcodeDistrict = getPostcodeDistrict(postcode);

  // Get or create area intelligence
  let areaIntel = await getAreaIntelligence(postcodeDistrict);

  // If we don't have data, calculate it
  if (!areaIntel) {
    areaIntel = await calculateAndStoreAreaIntelligence(postcodeDistrict);
  }

  // Determine if this is a new area for us
  const isNewArea = areaIntel.totalBookings < NEW_AREA_JOB_THRESHOLD;

  // Calculate future booking potential
  const futureBookingPotential = calculateFutureBookingPotential(
    areaIntel.estimatedBusinesses,
    areaIntel.totalCustomers,
    areaIntel.repeatFactor
  );

  // Calculate area presence score
  const areaPresence = calculateAreaPresenceScore(
    isNewArea,
    areaIntel.penetrationRate
  );

  // Calculate referral potential based on business density
  const referralPotential = calculateReferralPotential(
    areaIntel.businessDensityTier,
    areaIntel.primaryIndustry
  );

  // Calculate composite score
  const score = calculateNetworkScore(
    isNewArea,
    areaIntel.estimatedBusinesses,
    areaIntel.penetrationRate,
    areaIntel.repeatFactor
  );

  return {
    futureBookingPotential,
    areaPresence,
    referralPotential,
    score,
    isNewArea,
    postcodeDistrict,
  };
}

/**
 * Calculate future booking potential
 */
function calculateFutureBookingPotential(
  estimatedBusinesses: number,
  currentCustomers: number,
  repeatFactor: number
): number {
  // Untapped businesses * repeat factor
  const untapped = Math.max(0, estimatedBusinesses - currentCustomers);
  return untapped * repeatFactor;
}

/**
 * Calculate area presence score (0-100)
 */
function calculateAreaPresenceScore(
  isNewArea: boolean,
  penetrationRate: number
): number {
  if (isNewArea) {
    // New areas have high strategic value
    return 90;
  }

  // As penetration increases, presence value decreases
  // But never below 50 - established areas still valuable
  return Math.max(50, 80 - penetrationRate * 30);
}

/**
 * Calculate referral potential (0-1)
 */
function calculateReferralPotential(
  densityTier: string,
  primaryIndustry: string | null
): number {
  let potential = 0.5; // Base

  // High density areas have more referral potential
  if (densityTier === "high") {
    potential += 0.2;
  } else if (densityTier === "low") {
    potential -= 0.2;
  }

  // Business parks and office areas have high referral networks
  if (primaryIndustry === "office" || primaryIndustry === "industrial") {
    potential += 0.15;
  }

  return Math.min(1, Math.max(0, potential));
}

/**
 * Calculate composite network score (0-100)
 */
function calculateNetworkScore(
  isNewArea: boolean,
  estimatedBusinesses: number,
  penetrationRate: number,
  repeatFactor: number
): number {
  // New area with lots of businesses = very valuable
  if (isNewArea && estimatedBusinesses > 50) {
    return Math.min(100, 85 + estimatedBusinesses / 20);
  }

  // Low penetration with decent density
  if (penetrationRate < 0.1 && estimatedBusinesses > 30) {
    return 70 + (1 - penetrationRate) * 20;
  }

  // Medium penetration
  if (penetrationRate < 0.3) {
    return 50 + (1 - penetrationRate) * 30;
  }

  // Well-established area
  return 40 + repeatFactor * 20;
}

// =============================================================================
// AREA INTELLIGENCE
// =============================================================================

interface AreaIntelligenceData {
  postcodeDistrict: string;
  estimatedBusinesses: number;
  businessDensityTier: string;
  totalCustomers: number;
  totalBookings: number;
  penetrationRate: number;
  avgJobValue: number | null;
  cancellationRate: number | null;
  primaryIndustry: string | null;
  repeatFactor: number;
}

/**
 * Get stored area intelligence
 */
async function getAreaIntelligence(
  postcodeDistrict: string
): Promise<AreaIntelligenceData | null> {
  const record = await db.areaIntelligence.findUnique({
    where: { postcodeDistrict },
  });

  if (!record) return null;

  return {
    postcodeDistrict: record.postcodeDistrict,
    estimatedBusinesses: record.estimatedBusinesses,
    businessDensityTier: record.businessDensityTier,
    totalCustomers: record.totalCustomers,
    totalBookings: record.totalBookings,
    penetrationRate: record.penetrationRate,
    avgJobValue: record.avgJobValue,
    cancellationRate: record.cancellationRate,
    primaryIndustry: record.primaryIndustry,
    repeatFactor: record.repeatFactor,
  };
}

/**
 * Calculate and store area intelligence for a postcode district
 */
async function calculateAndStoreAreaIntelligence(
  postcodeDistrict: string
): Promise<AreaIntelligenceData> {
  // Count customers in this area
  const customersInArea = await db.site.count({
    where: {
      postcode: { startsWith: postcodeDistrict },
    },
  });

  // Count bookings in this area
  const bookingsInArea = await db.booking.count({
    where: {
      site: {
        postcode: { startsWith: postcodeDistrict },
      },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
  });

  // Get average job value and cancellation rate
  const bookingStats = await db.booking.aggregate({
    where: {
      site: {
        postcode: { startsWith: postcodeDistrict },
      },
    },
    _avg: { quotedPrice: true },
    _count: { id: true },
  });

  const cancelledCount = await db.booking.count({
    where: {
      site: {
        postcode: { startsWith: postcodeDistrict },
      },
      status: "CANCELLED",
    },
  });

  const totalBookingsForRate = bookingStats._count.id || 1;
  const cancellationRate = cancelledCount / totalBookingsForRate;

  // Estimate business density based on postcode prefix
  const businessDensity = estimateBusinessDensity(postcodeDistrict);

  // Determine primary industry (simplified - could use external data)
  const primaryIndustry = inferPrimaryIndustry(postcodeDistrict);

  // Calculate penetration rate
  const penetrationRate =
    businessDensity.estimated > 0
      ? customersInArea / businessDensity.estimated
      : 0;

  // Get repeat factor
  const repeatFactor = REPEAT_FACTORS[primaryIndustry] ?? 1.0;

  // Store for future use
  const data = {
    postcodeDistrict,
    estimatedBusinesses: businessDensity.estimated,
    businessDensityTier: businessDensity.tier,
    totalCustomers: customersInArea,
    totalBookings: bookingsInArea,
    penetrationRate,
    avgJobValue: bookingStats._avg.quotedPrice,
    cancellationRate,
    primaryIndustry,
    repeatFactor,
  };

  await db.areaIntelligence.upsert({
    where: { postcodeDistrict },
    update: {
      ...data,
      calculatedAt: new Date(),
    },
    create: data,
  });

  return data;
}

/**
 * Estimate business density for a postcode district
 */
function estimateBusinessDensity(postcodeDistrict: string): {
  estimated: number;
  tier: "high" | "medium" | "low" | "unknown";
} {
  // Central London postcodes - high density
  const highDensity = [
    "EC1",
    "EC2",
    "EC3",
    "EC4",
    "WC1",
    "WC2",
    "W1",
    "SW1",
    "SE1",
  ];

  // Inner London and major city centers
  const mediumDensity = [
    "E1",
    "E2",
    "N1",
    "NW1",
    "SW3",
    "SW5",
    "SW7",
    "W2",
    "W8",
    "W11",
    "M1",
    "M2",
    "B1",
    "B2",
    "L1",
    "L2",
    "G1",
    "G2",
    "BS1",
    "LS1",
  ];

  const district = postcodeDistrict.toUpperCase();

  if (highDensity.some((d) => district.startsWith(d))) {
    return { estimated: 500, tier: "high" };
  }

  if (mediumDensity.some((d) => district.startsWith(d))) {
    return { estimated: 200, tier: "medium" };
  }

  // Default to low density
  return { estimated: DEFAULT_BUSINESS_DENSITY, tier: "low" };
}

/**
 * Infer primary industry type from postcode
 * This is a simplified heuristic - could be enhanced with actual data
 */
function inferPrimaryIndustry(
  postcodeDistrict: string
): string {
  const district = postcodeDistrict.toUpperCase();

  // Financial districts
  if (
    district.startsWith("EC") ||
    district === "E14" || // Canary Wharf
    district === "SW1A" // Westminster
  ) {
    return "office";
  }

  // Retail areas
  if (
    district === "W1" || // West End
    district === "SW1" ||
    district === "WC2"
  ) {
    return "retail";
  }

  // Industrial areas
  if (
    district.startsWith("IG") || // East London industrial
    district.startsWith("RM") ||
    district.startsWith("DA") ||
    district.startsWith("UB")
  ) {
    return "industrial";
  }

  return "mixed";
}

// =============================================================================
// BATCH UPDATES
// =============================================================================

/**
 * Recalculate area intelligence for all areas
 * Should be run as a nightly batch job
 */
export async function recalculateAllAreaIntelligence(): Promise<{
  updated: number;
  errors: string[];
}> {
  // Get all unique postcode districts from sites
  const sites = await db.site.findMany({
    select: { postcode: true },
    distinct: ["postcode"],
  });

  const districts = new Set<string>();
  for (const site of sites) {
    districts.add(getPostcodeDistrict(site.postcode));
  }

  let updated = 0;
  const errors: string[] = [];

  for (const district of districts) {
    try {
      await calculateAndStoreAreaIntelligence(district);
      updated++;
    } catch (error) {
      errors.push(`Failed to update ${district}: ${error}`);
    }
  }

  return { updated, errors };
}

/**
 * Get top opportunities (areas with high potential but low penetration)
 */
export async function getTopOpportunityAreas(
  limit = 10
): Promise<
  {
    district: string;
    potential: number;
    penetrationRate: number;
    estimatedBusinesses: number;
  }[]
> {
  const areas = await db.areaIntelligence.findMany({
    where: {
      penetrationRate: { lt: 0.3 },
      estimatedBusinesses: { gt: 30 },
    },
    orderBy: [
      { penetrationRate: "asc" },
      { estimatedBusinesses: "desc" },
    ],
    take: limit,
  });

  return areas.map((a) => ({
    district: a.postcodeDistrict,
    potential: calculateFutureBookingPotential(
      a.estimatedBusinesses,
      a.totalCustomers,
      a.repeatFactor
    ),
    penetrationRate: a.penetrationRate,
    estimatedBusinesses: a.estimatedBusinesses,
  }));
}
