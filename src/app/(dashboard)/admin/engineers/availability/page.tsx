import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Availability | Admin",
  description: "Manage engineer schedules and availability",
};

export default async function EngineerAvailabilityPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Engineer Availability"
      description="View and manage engineer schedules"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Availability Management</p>
          <p className="text-sm mt-2">
            Coming soon: View engineer calendars, manage time off, and set availability windows
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
