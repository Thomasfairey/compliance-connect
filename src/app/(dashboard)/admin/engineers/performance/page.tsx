import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Performance | Admin",
  description: "View engineer performance metrics and ratings",
};

export default async function EngineerPerformancePage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Engineer Performance"
      description="Track performance metrics and ratings"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Performance Tracking</p>
          <p className="text-sm mt-2">
            Coming soon: Job completion rates, customer ratings, response times, and efficiency metrics
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
