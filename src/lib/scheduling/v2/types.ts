/**
 * Scheduling Intelligence V2 - Type Definitions
 *
 * This module defines all types for the multi-objective scheduling system
 * that optimizes for customer, engineer, and platform outcomes simultaneously.
 */

import type {
  Booking,
  User,
  Site,
  Service,
  EngineerProfile,
  EngineerCoverageArea,
  EngineerCompetency,
  EngineerQualification,
  CustomerMetrics,
  PricingRule as PricingRuleModel,
} from "@prisma/client";

// =============================================================================
// CORE SCORING TYPES
// =============================================================================

/**
 * Which party the score factor benefits
 */
export type ScoreParty = "customer" | "engineer" | "platform";

/**
 * Individual factor that contributes to overall score
 */
export interface ScoreFactor {
  /** Unique identifier for this factor */
  id: string;
  /** Human-readable name */
  name: string;
  /** Which party this factor benefits */
  party: ScoreParty;
  /** Raw value before normalization (for debugging/display) */
  rawValue: number | string;
  /** Unit for the raw value (e.g., "km", "minutes", "%") */
  rawUnit?: string;
  /** Normalized score 0-100 */
  normalizedScore: number;
  /** Weight within party (should sum to 1.0 within each party) */
  weight: number;
  /** Contribution to party score (normalizedScore * weight) */
  contribution: number;
  /** Optional explanation for this score */
  explanation?: string;
}

/**
 * Weights for balancing the three parties
 */
export interface ScoringWeights {
  /** Weight for customer satisfaction (default: 0.40) */
  customer: number;
  /** Weight for engineer satisfaction (default: 0.30) */
  engineer: number;
  /** Weight for platform value (default: 0.30) */
  platform: number;
}

/**
 * Complete score breakdown for a slot allocation
 */
export interface SlotScore {
  /** Aggregate customer score (0-100) */
  customerScore: number;
  /** Aggregate engineer score (0-100) */
  engineerScore: number;
  /** Aggregate platform score (0-100) */
  platformScore: number;
  /** Weighted composite score (0-100) */
  compositeScore: number;
  /** Weights used for this calculation */
  weights: ScoringWeights;
  /** All individual factors */
  factors: ScoreFactor[];
  /** Timestamp of calculation */
  calculatedAt: Date;
}

// =============================================================================
// TRAVEL & ROUTE TYPES
// =============================================================================

/**
 * Context for how a job fits into an engineer's existing route
 */
export type RouteContext =
  | "first_job" // First job of the day
  | "clustered" // Very close to existing jobs (<2km)
  | "nearby" // Close to existing jobs (2-5km)
  | "detour" // Reasonable detour (5-15km)
  | "distant"; // Far from existing jobs (15km+)

/**
 * Travel efficiency analysis for a job assignment
 */
export interface TravelEfficiency {
  /** Distance to travel (km) */
  distanceKm: number;
  /** Estimated travel time (minutes) */
  travelMinutes: number;
  /** Normalized efficiency score (0-100) */
  efficiencyScore: number;
  /** How this job fits into the route */
  routeContext: RouteContext;
  /** Km saved vs naive approach (from base) */
  savingsVsNaive: number;
  /** Previous location postcode (if applicable) */
  fromPostcode?: string;
  /** Job location postcode */
  toPostcode: string;
}

/**
 * Route insertion analysis
 */
export interface RouteInsertion {
  /** Additional km added by inserting this job */
  additionalKm: number;
  /** Additional minutes added */
  additionalMinutes: number;
  /** Optimal position in route (0-indexed) */
  optimalPosition: number;
  /** Does this displace an existing job's time? */
  displacesCurrent: boolean;
  /** Jobs that would come before this one */
  jobsBefore: string[];
  /** Jobs that would come after this one */
  jobsAfter: string[];
}

/**
 * Route continuity analysis
 */
export interface RouteContinuity {
  /** Cost of inserting this job into route */
  insertionCost: number;
  /** Normalized continuity score (0-100) */
  score: number;
  /** How well this fills time gaps (0-1) */
  gapUtilization: number;
  /** How aligned with overall route direction (0-1) */
  directionAlignment: number;
}

/**
 * Optimized route for a day
 */
export interface OptimizedRoute {
  /** Engineer ID */
  engineerId: string;
  /** Date of route */
  date: Date;
  /** Ordered list of stops */
  stops: RouteStop[];
  /** Total distance (km) */
  totalKm: number;
  /** Total travel time (minutes) */
  totalTravelMinutes: number;
  /** Total working time including travel (minutes) */
  totalDayMinutes: number;
  /** Efficiency rating (0-100) */
  efficiencyRating: number;
}

/**
 * Single stop in a route
 */
export interface RouteStop {
  /** Booking ID */
  bookingId: string;
  /** Order in route (1-indexed) */
  order: number;
  /** Site postcode */
  postcode: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Scheduled time slot */
  slot: string;
  /** Estimated arrival time */
  estimatedArrival?: string;
  /** Estimated duration (minutes) */
  estimatedDuration: number;
  /** Distance from previous stop (km) */
  distanceFromPrevious?: number;
  /** Travel time from previous (minutes) */
  travelFromPrevious?: number;
}

// =============================================================================
// WORKLOAD TYPES
// =============================================================================

/**
 * Workload balance analysis for an engineer
 */
export interface WorkloadBalance {
  /** Jobs scheduled this week */
  weeklyJobCount: number;
  /** Revenue this week */
  weeklyRevenue: number;
  /** Travel km this week */
  weeklyTravelKm: number;
  /** Compared to average (1.0 = average, >1 = above) */
  comparedToAverage: number;
  /** Normalized balance score (0-100) */
  score: number;
  /** Is this engineer overloaded? */
  isOverloaded: boolean;
  /** Is this engineer underloaded? */
  isUnderloaded: boolean;
  /** Jobs on the specific day */
  jobsOnDay: number;
  /** Maximum recommended jobs per day */
  maxJobsPerDay: number;
}

// =============================================================================
// NETWORK EFFECT TYPES
// =============================================================================

/**
 * Network effect analysis for an area
 */
export interface NetworkEffect {
  /** Potential future bookings in area */
  futureBookingPotential: number;
  /** Our presence score in this area (0-100) */
  areaPresence: number;
  /** Referral potential (0-1) */
  referralPotential: number;
  /** Normalized network score (0-100) */
  score: number;
  /** Is this a new area for us? */
  isNewArea: boolean;
  /** Postcode district */
  postcodeDistrict: string;
}

// =============================================================================
// CANCELLATION RISK TYPES
// =============================================================================

/**
 * Risk factor contributing to cancellation prediction
 */
export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Impact on probability (-1 to +1, negative reduces risk) */
  impact: number;
  /** Actual value */
  value: string | number;
}

/**
 * Cancellation risk prediction
 */
export interface CancellationRisk {
  /** Probability of cancellation (0-1) */
  probability: number;
  /** Normalized score (higher = lower risk, 0-100) */
  score: number;
  /** Factors contributing to risk */
  factors: RiskFactor[];
  /** Suggested mitigations if risk is high */
  mitigations: string[];
  /** Risk tier */
  tier: "low" | "medium" | "high";
}

// =============================================================================
// CUSTOMER METRICS TYPES
// =============================================================================

/**
 * Customer lifetime value analysis
 */
export interface CustomerLTV {
  /** Total revenue from this customer */
  totalRevenue: number;
  /** Number of completed bookings */
  completedBookings: number;
  /** Cancellation rate (0-1) */
  cancellationRate: number;
  /** LTV score (0-100) */
  ltvScore: number;
  /** Reliability score (0-100) */
  reliabilityScore: number;
  /** Frequency score (0-100) */
  frequencyScore: number;
  /** Combined normalized score for allocation (0-100) */
  score: number;
}

// =============================================================================
// PRICING TYPES
// =============================================================================

/**
 * Context provided to pricing rules
 */
export interface PricingContext {
  /** The booking being priced */
  booking: BookingRequest;
  /** Proposed slot */
  slot: ScheduleSlot;
  /** Assigned engineer (if known) */
  engineer?: EngineerWithProfile;
  /** Customer information */
  customer: CustomerInfo;
  /** Existing bookings in the area/time (for cluster detection) */
  nearbyBookings: Booking[];
  /** Base price before adjustments */
  basePrice: number;
  /** Service being booked */
  service: Service;
}

/**
 * Result of a pricing rule calculation
 */
export interface PricingAdjustment {
  /** Rule ID that generated this */
  ruleId: string;
  /** Rule name */
  ruleName: string;
  /** Type of adjustment */
  type: "discount" | "premium";
  /** Fixed amount adjustment */
  amount: number;
  /** Percentage adjustment (0-100) */
  percent: number;
  /** Human-readable reason */
  reason: string;
  /** Should this be shown to customer? */
  customerVisible: boolean;
}

/**
 * Complete pricing calculation result
 */
export interface PricingResult {
  /** Original base price */
  basePrice: number;
  /** All adjustments applied */
  adjustments: PricingAdjustment[];
  /** Total discount amount */
  totalDiscount: number;
  /** Total premium amount */
  totalPremium: number;
  /** Final price after all adjustments */
  finalPrice: number;
  /** Effective discount percentage */
  effectiveDiscountPercent: number;
  /** Breakdown for customer display */
  customerBreakdown: PricingBreakdownItem[];
}

/**
 * Single line item in pricing breakdown
 */
export interface PricingBreakdownItem {
  /** Label to show */
  label: string;
  /** Amount (positive = added, negative = subtracted) */
  amount: number;
  /** Is this a highlight/feature? */
  isHighlight: boolean;
}

/**
 * Pricing rule configuration (stored in DB)
 */
export interface PricingRuleConfig {
  // Cluster discount config
  cluster?: {
    radiusKm: number;
    minJobs: number;
    discountPercent: number;
  };
  // Urgency premium config
  urgency?: {
    daysThreshold: number;
    premiumPercent: number;
  };
  // Off-peak discount config
  offpeak?: {
    days: number[]; // 0=Sun, 1=Mon, etc.
    discountPercent: number;
  };
  // Flex date discount config
  flex?: {
    daysFlexible: number;
    discountPercent: number;
  };
  // Loyalty discount config
  loyalty?: {
    minBookings: number;
    discountPercent: number;
  };
}

// =============================================================================
// BOOKING & SLOT TYPES
// =============================================================================

/**
 * Incoming booking request (before allocation)
 */
export interface BookingRequest {
  /** Customer ID */
  customerId: string;
  /** Site ID */
  siteId: string;
  /** Service ID */
  serviceId: string;
  /** Preferred date */
  preferredDate?: Date;
  /** Preferred times */
  preferredTimes?: ("AM" | "PM" | "FULL_DAY")[];
  /** Flexibility level */
  flexibility?: "exact" | "flexible_day" | "flexible_week";
  /** Budget sensitivity */
  budgetSensitive?: boolean;
  /** Expected price (for budget comparison) */
  expectedPrice?: number;
  /** Estimated quantity */
  estimatedQty: number;
  /** Additional notes */
  notes?: string;
}

/**
 * Available schedule slot
 */
export interface ScheduleSlot {
  /** Unique slot identifier */
  id: string;
  /** Date of slot */
  date: Date;
  /** Time slot */
  slot: "AM" | "PM";
  /** Proposed start time (HH:MM) */
  startTime: string;
  /** Proposed end time (HH:MM) */
  endTime: string;
  /** Engineer ID */
  engineerId: string;
  /** Estimated price for this slot */
  estimatedPrice: number;
  /** Estimated duration (minutes) */
  estimatedDuration: number;
  /** Is this a cluster opportunity? */
  isClusterOpportunity: boolean;
  /** Existing jobs in same area */
  nearbyJobCount: number;
}

/**
 * Engineer with full profile data
 */
export interface EngineerWithProfile {
  /** User record */
  user: User;
  /** Engineer profile */
  profile: EngineerProfile;
  /** Coverage areas */
  coverageAreas: EngineerCoverageArea[];
  /** Competencies */
  competencies: EngineerCompetency[];
  /** Qualifications */
  qualifications: EngineerQualification[];
  /** Base postcode (derived from primary coverage area) */
  basePostcode: string;
  /** Preferred radius (km) */
  preferredRadiusKm: number;
}

/**
 * Basic customer info for scoring
 */
export interface CustomerInfo {
  /** User ID */
  id: string;
  /** Customer name */
  name: string;
  /** Company name */
  companyName?: string;
  /** Metrics (if available) */
  metrics?: CustomerMetrics;
}

// =============================================================================
// ALLOCATION TYPES
// =============================================================================

/**
 * Candidate engineer for allocation
 */
export interface AllocationCandidate {
  /** Engineer data */
  engineer: EngineerWithProfile;
  /** Proposed slot */
  slot: ScheduleSlot;
  /** Full score breakdown */
  score: SlotScore;
  /** Is this candidate viable? */
  isViable: boolean;
  /** Reasons if not viable */
  nonViableReasons?: string[];
}

/**
 * Result of allocation attempt
 */
export interface AllocationResultV2 {
  /** Was allocation successful? */
  success: boolean;
  /** Selected candidate (if successful) */
  selected?: AllocationCandidate;
  /** All candidates considered */
  candidates: AllocationCandidate[];
  /** Error message (if failed) */
  error?: string;
  /** V1 comparison (for shadow mode) */
  v1Comparison?: {
    v1EngineerId: string;
    v1Score: number;
    wouldHaveChanged: boolean;
    improvementPercent: number;
  };
}

// =============================================================================
// SLOT PRESENTATION TYPES
// =============================================================================

/**
 * Badge to display on a slot
 */
export interface SlotBadge {
  /** Badge type */
  type:
    | "BEST_VALUE"
    | "FASTEST"
    | "TOP_RATED"
    | "ECO_FRIENDLY"
    | "CLUSTER_DISCOUNT";
  /** Display label */
  label: string;
  /** Badge color */
  color: "green" | "blue" | "gold" | "purple" | "teal";
}

/**
 * Slot presented to customer
 */
export interface PresentedSlot {
  /** Underlying slot */
  slot: ScheduleSlot;
  /** Engineer summary (name, rating, jobs completed) */
  engineer: {
    name: string;
    rating: number;
    jobsCompleted: number;
    yearsExperience: number;
  };
  /** Final price */
  price: number;
  /** Original price (before discounts) */
  originalPrice: number;
  /** Discount amount */
  discountAmount: number;
  /** Badges to display */
  badges: SlotBadge[];
  /** Short explanation for customer */
  explanation: string;
}

/**
 * Savings breakdown for customer
 */
export interface SavingsBreakdown {
  /** Total potential savings */
  totalSavings: number;
  /** Cluster savings */
  clusterSavings: number;
  /** Flexibility savings */
  flexSavings: number;
  /** Other savings */
  otherSavings: number;
  /** Explanation text */
  explanation: string;
}

/**
 * Flexibility prompt for customer
 */
export interface FlexibilityPrompt {
  /** Should we show the prompt? */
  showPrompt: boolean;
  /** Message to display */
  message?: string;
  /** Potential savings */
  potentialSavings?: number;
  /** Alternative date that would be cheaper */
  alternativeDate?: Date;
}

/**
 * Complete slot presentation for customer
 */
export interface SlotPresentation {
  /** Recommended slot */
  recommended: PresentedSlot;
  /** Alternative options */
  alternatives: PresentedSlot[];
  /** Savings breakdown */
  savings: SavingsBreakdown;
  /** Flexibility prompt */
  flexibility: FlexibilityPrompt;
}

// =============================================================================
// OPTIMIZATION TYPES
// =============================================================================

/**
 * Swap opportunity between engineers
 */
export interface SwapOpportunity {
  /** First booking to swap */
  booking1Id: string;
  /** Second booking to swap */
  booking2Id: string;
  /** Current engineer for booking 1 */
  engineer1Id: string;
  /** Current engineer for booking 2 */
  engineer2Id: string;
  /** Current combined score */
  currentTotal: number;
  /** Score after swap */
  swappedTotal: number;
  /** Improvement percentage */
  improvementPercent: number;
  /** Explanation */
  explanation: string;
}

/**
 * Result of optimization run
 */
export interface OptimizationResult {
  /** Type of optimization found */
  type: "SWAP_RECOMMENDED" | "ALLOCATION_AVAILABLE" | "ROUTE_IMPROVED";
  /** Date affected */
  date: Date;
  /** Current score */
  currentScore: number;
  /** New score after optimization */
  newScore: number;
  /** Improvement amount */
  improvement: number;
  /** Details specific to optimization type */
  details: SwapOpportunity | AllocationResultV2;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Geographic coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Time gap in schedule
 */
export interface TimeGap {
  /** Start time (HH:MM) */
  start: string;
  /** End time (HH:MM) */
  end: string;
  /** Duration (minutes) */
  durationMinutes: number;
  /** Previous job (if any) */
  previousJobId?: string;
  /** Next job (if any) */
  nextJobId?: string;
}

/**
 * Feature flags for incremental rollout
 */
export interface SchedulingFeatureFlags {
  /** Use V2 scorer */
  useV2Scorer: boolean;
  /** Run shadow mode (calculate both, log comparison) */
  shadowMode: boolean;
  /** Enable cluster pricing */
  clusterPricing: boolean;
  /** Enable real-time optimization */
  realtimeOptimization: boolean;
  /** Enable customer LTV scoring */
  customerLtvScoring: boolean;
  /** Enable cancellation prediction */
  cancellationPrediction: boolean;
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  customer: 0.4,
  engineer: 0.3,
  platform: 0.3,
};

/**
 * Customer-focused scoring weights (for slot presentation)
 */
export const CUSTOMER_FOCUSED_WEIGHTS: ScoringWeights = {
  customer: 0.5,
  engineer: 0.25,
  platform: 0.25,
};

/**
 * Default feature flags (conservative rollout)
 */
export const DEFAULT_FEATURE_FLAGS: SchedulingFeatureFlags = {
  useV2Scorer: false,
  shadowMode: true,
  clusterPricing: true,
  realtimeOptimization: false,
  customerLtvScoring: true,
  cancellationPrediction: true,
};
