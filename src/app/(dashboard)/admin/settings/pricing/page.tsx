import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PricingSettingsClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing Settings | Admin",
  description: "Configure service pricing and rules",
};

export default async function PricingSettingsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [services, pricingRules] = await Promise.all([
    db.service.findMany({
      orderBy: { name: "asc" },
    }),
    db.pricingRule.findMany({
      orderBy: { priority: "asc" },
    }),
  ]);

  return (
    <PricingSettingsClient
      services={services}
      pricingRules={pricingRules}
    />
  );
}
