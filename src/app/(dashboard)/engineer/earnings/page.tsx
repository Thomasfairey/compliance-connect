import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getCurrentMonthEarnings } from "@/lib/actions/compensation";
import { PageHeader } from "@/components/shared";
import { EarningsSummary } from "@/components/engineer/earnings-summary";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Earnings",
};

export default async function EngineerEarningsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER") {
    redirect("/dashboard");
  }

  const earnings = await getCurrentMonthEarnings();

  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Track your compensation and earnings."
        backHref="/engineer"
      />

      {earnings ? (
        <EarningsSummary summary={earnings} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No earnings data yet
            </h3>
            <p className="text-gray-500 text-center max-w-sm">
              Complete jobs to start tracking your earnings. PAT test counts, electrical work,
              and consultant days will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
