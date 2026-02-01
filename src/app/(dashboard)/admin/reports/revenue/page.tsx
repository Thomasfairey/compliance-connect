import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Revenue Report | Admin",
  description: "View revenue analytics and trends",
};

export default async function RevenueReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Revenue Report"
      description="Monthly and yearly revenue breakdown"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Revenue Analytics</p>
          <p className="text-sm mt-2">
            Coming soon: Revenue by service, region, time period, and customer segment
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
