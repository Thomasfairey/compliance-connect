import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarClient } from "./client";
import { addDays, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar | Engineer",
};

export default async function EngineerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { week } = await searchParams;
  const baseDate = week ? parseISO(week) : new Date();
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  // Fetch this week's jobs + available (unassigned) jobs
  const [jobs, availableJobs] = await Promise.all([
    db.booking.findMany({
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
    }),
    db.booking.findMany({
      where: {
        engineerId: null,
        status: "PENDING",
        scheduledDate: {
          gte: startOfDay(weekStart),
          lte: endOfDay(weekEnd),
        },
      },
      include: {
        service: true,
        site: true,
      },
      orderBy: [
        { scheduledDate: "asc" },
        { slot: "asc" },
      ],
    }),
  ]);

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

  const availableJobsData = availableJobs.map((job) => ({
    id: job.id,
    date: job.scheduledDate.toISOString(),
    slot: job.slot,
    serviceName: job.service.name,
    siteName: job.site.name,
    postcode: job.site.postcode,
  }));

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const now = new Date();
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
      availableJobs={availableJobsData}
    />
  );
}
