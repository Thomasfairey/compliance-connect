import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarClient } from "./client";
import { addDays, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar | Engineer",
};

export default async function EngineerCalendarPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Fetch this week's jobs
  const jobs = await db.booking.findMany({
    where: {
      engineerId: user.id,
      scheduledDate: {
        gte: startOfDay(weekStart),
        lte: endOfDay(weekEnd),
      },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    include: {
      service: true,
      site: true,
      customer: true,
    },
    orderBy: [
      { scheduledDate: "asc" },
      { slot: "asc" },
    ],
  });

  // Transform for client
  const calendarJobs = jobs.map((job) => ({
    id: job.id,
    date: job.scheduledDate.toISOString(),
    slot: job.slot,
    status: job.status,
    customerName: job.customer.name,
    serviceName: job.service.name,
    postcode: job.site.postcode,
    estimatedDuration: job.estimatedDuration || 60,
  }));

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date: date.toISOString(),
      dayName: date.toLocaleDateString("en-GB", { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: startOfDay(date).getTime() === startOfDay(now).getTime(),
    };
  });

  return (
    <CalendarClient
      weekDays={weekDays}
      jobs={calendarJobs}
      weekStartDate={weekStart.toISOString()}
    />
  );
}
