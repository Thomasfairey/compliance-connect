import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarClient } from "./client";
import { startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master Calendar | Admin",
  description: "View and manage all engineer schedules",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const targetDate = params.date === "today" ? new Date() : params.date ? new Date(params.date) : new Date();
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const [bookings, engineers, unallocatedCount] = await Promise.all([
    db.booking.findMany({
      where: {
        scheduledDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        service: true,
        site: true,
        customer: true,
        engineer: true,
      },
      orderBy: { scheduledDate: "asc" },
    }),
    db.user.findMany({
      where: {
        role: "ENGINEER",
        engineerProfile: {
          status: "APPROVED",
        },
      },
      include: {
        engineerProfile: true,
      },
    }),
    db.booking.count({
      where: { status: "PENDING", engineerId: null },
    }),
  ]);

  return (
    <CalendarClient
      bookings={bookings}
      engineers={engineers}
      initialDate={targetDate.toISOString()}
      unallocatedCount={unallocatedCount}
    />
  );
}
