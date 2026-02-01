import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { SchedulingControlClient } from "./client";
import { db } from "@/lib/db";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/scheduling/v2/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scheduling Control | Admin",
  description: "Configure scheduling weights and pricing rules",
};

export default async function SchedulingControlPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get current pricing rules from database
  const pricingRules = await db.pricingRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });

  // Transform pricing rules to our format
  const initialRules = {
    clusterDiscount: {
      enabled: pricingRules.some((r) => r.type === "cluster"),
      radiusKm: (pricingRules.find((r) => r.type === "cluster")?.config as any)?.cluster?.radiusKm ?? 5,
      discountPercent: (pricingRules.find((r) => r.type === "cluster")?.config as any)?.cluster?.discountPercent ?? 10,
      minJobs: (pricingRules.find((r) => r.type === "cluster")?.config as any)?.cluster?.minJobs ?? 1,
    },
    flexDiscount: {
      enabled: pricingRules.some((r) => r.type === "flex"),
      discountPercent: (pricingRules.find((r) => r.type === "flex")?.config as any)?.flex?.discountPercent ?? 7,
    },
    urgencyPremium: {
      enabled: pricingRules.some((r) => r.type === "urgency"),
      sameDayPercent: (pricingRules.find((r) => r.type === "urgency")?.config as any)?.urgency?.premiumPercent ?? 15,
      nextDayPercent: Math.round(((pricingRules.find((r) => r.type === "urgency")?.config as any)?.urgency?.premiumPercent ?? 15) * 0.7),
      daysThreshold: (pricingRules.find((r) => r.type === "urgency")?.config as any)?.urgency?.daysThreshold ?? 2,
    },
    offPeakDiscount: {
      enabled: pricingRules.some((r) => r.type === "offpeak"),
      discountPercent: (pricingRules.find((r) => r.type === "offpeak")?.config as any)?.offpeak?.discountPercent ?? 5,
      days: (pricingRules.find((r) => r.type === "offpeak")?.config as any)?.offpeak?.days ?? [1, 2],
    },
    loyaltyDiscount: {
      enabled: pricingRules.some((r) => r.type === "loyalty"),
      minBookings: (pricingRules.find((r) => r.type === "loyalty")?.config as any)?.loyalty?.minBookings ?? 5,
      discountPercent: (pricingRules.find((r) => r.type === "loyalty")?.config as any)?.loyalty?.discountPercent ?? 5,
    },
    minimumMargin: 25,
  };

  return (
    <SchedulingControlClient
      initialWeights={DEFAULT_SCORING_WEIGHTS}
      initialRules={initialRules}
    />
  );
}
