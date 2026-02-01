import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking Analytics | Admin",
  description: "View booking trends and analytics",
};

export default async function BookingReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Booking Analytics"
      description="Booking trends and completion analysis"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Booking Analytics</p>
          <p className="text-sm mt-2">
            Coming soon: Booking volume trends, completion rates, cancellation analysis, and peak times
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
