import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Map, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Geographic Insights | Admin",
  description: "View geographic performance analytics",
};

export default async function GeographicReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Geographic Insights"
      description="Performance by region and expansion opportunities"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Map className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Geographic Analytics</p>
          <p className="text-sm mt-2">
            Coming soon: Regional performance heatmaps, coverage gaps, and expansion opportunities
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
