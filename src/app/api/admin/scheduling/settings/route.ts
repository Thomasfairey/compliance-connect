import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ScoringWeights } from "@/lib/scheduling/v2/types";

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
