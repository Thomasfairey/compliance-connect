/**
 * Scheduling Intelligence V2 - Public API
 *
 * This module provides multi-objective scheduling optimization that balances
 * customer satisfaction, engineer efficiency, and platform value.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { findBestEngineerV2, presentSlotsToCustomer } from '@/lib/scheduling/v2';
 *
 * // Find best engineer for a booking
 * const result = await findBestEngineerV2(bookingId);
 *
 * // Present slots to customer
 * const presentation = await presentSlotsToCustomer(bookingRequest);
 * ```
 *
 * ## Architecture
 *
 * The V2 scheduling system uses a multi-objective scoring approach:
 *
 * 1. **Customer Factors** (40% default weight)
 *    - Time match, wait time, engineer quality, price fit
 *
 * 2. **Engineer Factors** (30% default weight)
 *    - Travel efficiency, earnings/hour, route continuity, workload balance
 *
 * 3. **Platform Factors** (30% default weight)
 *    - Margin, utilization, customer LTV, network effect, cancellation risk
 *
 * ## Migration Path
 *
 * 1. Start with `shadowMode: true` to compare V1 vs V2 decisions
 * 2. Monitor V2 performance in AllocationScoreLog
 * 3. Gradually switch traffic to V2
 * 4. Deprecate V1 when confident
 */

// =============================================================================
// CORE ALLOCATION
// =============================================================================

export {
  findBestEngineerV2,
  autoAllocateBookingV2,
  getViableSlots,
} from "./allocator";

// =============================================================================
// SCORING
// =============================================================================

export {
  scoreSlotAllocation,
  getScoreSummary,
  getTopFactors,
} from "./scorer";

// =============================================================================
// CUSTOMER PRESENTATION
// =============================================================================

export {
  presentSlotsToCustomer,
  generateScoreDisplay,
} from "./slot-presentation";

// =============================================================================
// PRICING
// =============================================================================

export {
  calculatePrice,
  getAllPricingRules,
  togglePricingRule,
  updatePricingRuleConfig,
  createPricingRule,
  simulatePricing,
} from "./pricing-engine";

// =============================================================================
// INDIVIDUAL CALCULATORS
// =============================================================================

export {
  calculateTravelEfficiency,
  buildOptimizedRoute,
  estimateTravelTime,
  calculateBearing,
  calculateDistanceScore,
} from "./travel";

export {
  calculateRouteContinuity,
  findTimeGaps,
} from "./route";

export {
  calculateWorkloadBalance,
  getEngineersByCapacity,
  isEngineerAvailableForMore,
  getAllEngineersWeeklyStats,
} from "./workload";

export {
  calculateNetworkEffect,
  recalculateAllAreaIntelligence,
  getTopOpportunityAreas,
} from "./network";

export {
  predictCancellationRisk,
  adjustRiskForPayment,
  getHistoricalCancellationRate,
  getCancellationRiskSummary,
} from "./cancellation";

export {
  getCustomerLTV,
  recalculateCustomerMetrics,
  onBookingCompleted,
  onBookingCancelled,
  recalculateAllCustomerMetrics,
  getTopCustomers,
  getChurnRiskCustomers,
  getUnreliableCustomers,
} from "./customer-metrics";

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Core scoring
  SlotScore,
  ScoreFactor,
  ScoreParty,
  ScoringWeights,

  // Travel & Route
  TravelEfficiency,
  RouteContext,
  RouteInsertion,
  RouteContinuity,
  OptimizedRoute,
  RouteStop,
  TimeGap,

  // Workload
  WorkloadBalance,

  // Network
  NetworkEffect,

  // Cancellation
  CancellationRisk,
  RiskFactor,

  // Customer
  CustomerLTV,

  // Pricing
  PricingContext,
  PricingAdjustment,
  PricingResult,
  PricingRuleConfig,
  PricingBreakdownItem,

  // Booking & Slots
  BookingRequest,
  ScheduleSlot,
  EngineerWithProfile,
  CustomerInfo,

  // Allocation
  AllocationCandidate,
  AllocationResultV2,

  // Presentation
  SlotPresentation,
  PresentedSlot,
  SlotBadge,
  SavingsBreakdown,
  FlexibilityPrompt,

  // Optimization
  SwapOpportunity,
  OptimizationResult,

  // Config
  SchedulingFeatureFlags,
  Coordinates,
} from "./types";

export {
  DEFAULT_SCORING_WEIGHTS,
  CUSTOMER_FOCUSED_WEIGHTS,
  DEFAULT_FEATURE_FLAGS,
} from "./types";

// =============================================================================
// VERSION INFO
// =============================================================================

export const SCHEDULING_VERSION = {
  major: 2,
  minor: 0,
  patch: 0,
  label: "v2.0.0",
  description: "Multi-objective scheduling with 13-factor scoring",
  features: [
    "Multi-objective scoring (customer, engineer, platform)",
    "13 individual scoring factors",
    "Extensible pricing rules",
    "Customer LTV tracking",
    "Cancellation risk prediction",
    "Network effect scoring",
    "Shadow mode for safe rollout",
    "Route optimization",
    "Workload balancing",
  ],
};
