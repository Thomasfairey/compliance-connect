import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { getEngineersAvailability } from "@/lib/actions/engineer";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { AdminAvailabilityClient } from "@/components/admin/admin-availability-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Availability | Admin",
  description: "Manage engineer schedules and availability",
};

export default async function EngineerAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // Parse week from search params or use current week
  const baseDate = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday

  // Get all engineers with their availability
  const engineers = await getEngineersAvailability(weekStart, weekEnd);

  // Generate array of dates for the week
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(addDays(weekStart, i));
  }

  return (
    <AdminPage
      title="Engineer Availability"
      description={`Week of ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`}
    >
      <AdminAvailabilityClient
        engineers={engineers}
        weekDates={weekDates}
        weekStart={weekStart}
      />
    </AdminPage>
  );
}
