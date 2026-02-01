import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Report | Admin",
  description: "View engineer performance analytics",
};

export default async function EngineerReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Engineer Performance Report"
      description="Individual engineer metrics and ratings"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Engineer Performance Analytics</p>
          <p className="text-sm mt-2">
            Coming soon: Jobs completed, average ratings, response times, and utilization rates
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
