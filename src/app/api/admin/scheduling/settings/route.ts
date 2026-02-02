import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ScoringWeights } from "@/lib/scheduling/v2/types";

interface PricingRules {
  clusterDiscount: {
    enabled: boolean;
    radiusKm: number;
    discountPercent: number;
    minJobs: number;
  };
  flexDiscount: {
    enabled: boolean;
    discountPercent: number;
  };
  urgencyPremium: {
    enabled: boolean;
    sameDayPercent: number;
    nextDayPercent: number;
    daysThreshold: number;
  };
  offPeakDiscount: {
    enabled: boolean;
    discountPercent: number;
    days: number[];
  };
  loyaltyDiscount: {
    enabled: boolean;
    minBookings: number;
    discountPercent: number;
  };
  minimumMargin: number;
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { weights, rules } = (await request.json()) as {
      weights: ScoringWeights;
      rules: PricingRules;
    };

    // Update or create pricing rules
    const ruleUpdates = [
      {
        slug: "cluster-discount",
        type: "cluster",
        name: "Cluster Discount",
        enabled: rules.clusterDiscount.enabled,
        config: {
          cluster: {
            radiusKm: rules.clusterDiscount.radiusKm,
            discountPercent: rules.clusterDiscount.discountPercent,
            minJobs: rules.clusterDiscount.minJobs,
          },
        },
        priority: 1,
      },
      {
        slug: "urgency-premium",
        type: "urgency",
        name: "Urgency Premium",
        enabled: rules.urgencyPremium.enabled,
        config: {
          urgency: {
            daysThreshold: rules.urgencyPremium.daysThreshold,
            premiumPercent: rules.urgencyPremium.sameDayPercent,
          },
        },
        priority: 2,
      },
      {
        slug: "offpeak-discount",
        type: "offpeak",
        name: "Off-Peak Discount",
        enabled: rules.offPeakDiscount.enabled,
        config: {
          offpeak: {
            days: rules.offPeakDiscount.days,
            discountPercent: rules.offPeakDiscount.discountPercent,
          },
        },
        priority: 3,
      },
      {
        slug: "flex-discount",
        type: "flex",
        name: "Flexibility Discount",
        enabled: rules.flexDiscount.enabled,
        config: {
          flex: {
            daysFlexible: 7,
            discountPercent: rules.flexDiscount.discountPercent,
          },
        },
        priority: 4,
      },
      {
        slug: "loyalty-discount",
        type: "loyalty",
        name: "Loyalty Discount",
        enabled: rules.loyaltyDiscount.enabled,
        config: {
          loyalty: {
            minBookings: rules.loyaltyDiscount.minBookings,
            discountPercent: rules.loyaltyDiscount.discountPercent,
          },
        },
        priority: 5,
      },
    ];

    // Upsert all pricing rules
    for (const rule of ruleUpdates) {
      await db.pricingRule.upsert({
        where: { slug: rule.slug },
        update: {
          enabled: rule.enabled,
          config: rule.config,
        },
        create: {
          slug: rule.slug,
          type: rule.type,
          name: rule.name,
          enabled: rule.enabled,
          config: rule.config,
          priority: rule.priority,
        },
      });
    }

    // Store scoring weights as a special pricing rule
    // Cast to JSON-compatible object for Prisma
    const weightsJson = {
      customer: weights.customer,
      engineer: weights.engineer,
      platform: weights.platform,
    };

    await db.pricingRule.upsert({
      where: { slug: "scoring-weights" },
      update: {
        config: weightsJson,
      },
      create: {
        slug: "scoring-weights",
        type: "scoring_weights",
        name: "Scoring Weights",
        description: "Weights for customer, engineer, and platform scoring",
        enabled: true,
        config: weightsJson,
        priority: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving scheduling settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pricingRules = await db.pricingRule.findMany({
      orderBy: { priority: "asc" },
    });

    // Extract scoring weights from pricing rules
    const scoringWeightsRule = pricingRules.find(
      (rule) => rule.slug === "scoring-weights"
    );
    const scoringWeights = scoringWeightsRule?.config as ScoringWeights | null;

    // Filter out the scoring weights from the pricing rules list
    const filteredRules = pricingRules.filter(
      (rule) => rule.slug !== "scoring-weights"
    );

    return NextResponse.json({
      pricingRules: filteredRules,
      scoringWeights,
    });
  } catch (error) {
    console.error("Error fetching scheduling settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
