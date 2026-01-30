import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getComplianceStatus } from "@/lib/actions/compliance";
import { ComplianceDashboard } from "@/components/compliance/compliance-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compliance Tracker",
};

export default async function CompliancePage() {
  const user = await getOrCreateUser();

  if (user.role !== "CUSTOMER") {
    redirect("/dashboard");
  }

  const statuses = await getComplianceStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Tracker</h1>
        <p className="text-gray-500">
          Track your compliance testing schedules and enable auto-rebooking.
        </p>
      </div>

      <ComplianceDashboard statuses={statuses} />
    </div>
  );
}
