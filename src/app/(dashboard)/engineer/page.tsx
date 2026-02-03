import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TodayViewClient } from "./today-client";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today | Engineer",
};

export default async function EngineerTodayPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fetch today's jobs for this engineer
  const todayJobs = await db.booking.findMany({
    where: {
      engineerId: user.id,
      scheduledDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    include: {
      service: true,
      site: true,
      customer: true,
    },
    orderBy: [
      { slot: "asc" },
      { scheduledDate: "asc" },
    ],
  });

  // Transform jobs for the client
  const jobs = todayJobs.map((job) => ({
    id: job.id,
    status: job.status,
    customerName: job.customer.name,
    address: job.site.address,
    postcode: job.site.postcode,
    scheduledTime: job.slot === "AM" ? "8:00 - 12:00" : "12:00 - 17:00",
    slot: job.slot,
    services: [job.service.name],
    contactName: job.customer.name,
    contactPhone: job.customer.phone || undefined,
    accessNotes: job.site.accessNotes || undefined,
    estimatedDuration: job.estimatedDuration || 60,
    quotedPrice: job.quotedPrice,
    siteLatitude: job.site.latitude ?? null,
    siteLongitude: job.site.longitude ?? null,
  }));

  // Calculate today's potential earnings
  const todayEarnings = jobs
    .filter((j) => j.status === "COMPLETED")
    .reduce((sum, j) => sum + (j.quotedPrice * 0.6), 0); // Assuming 60% engineer cut

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;
  const totalHours = jobs.reduce((sum, j) => sum + j.estimatedDuration, 0) / 60;

  return (
    <TodayViewClient
      userName={user.name.split(" ")[0]}
      jobs={jobs}
      stats={{
        todayEarnings,
        totalJobs,
        completedJobs,
        totalHours: Math.round(totalHours * 10) / 10,
      }}
    />
  );
}
