import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EarningsClient } from "./client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Earnings | Engineer",
};

export default async function EngineerEarningsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch completed jobs for this week
  const [weeklyJobs, monthlyJobs, recentJobs] = await Promise.all([
    db.booking.findMany({
      where: {
        engineerId: user.id,
        status: "COMPLETED",
        completedAt: { gte: weekStart, lte: weekEnd },
      },
      include: { service: true, customer: true },
    }),
    db.booking.findMany({
      where: {
        engineerId: user.id,
        status: "COMPLETED",
        completedAt: { gte: monthStart, lte: monthEnd },
      },
      include: { service: true, customer: true },
    }),
    db.booking.findMany({
      where: {
        engineerId: user.id,
        status: "COMPLETED",
      },
      include: { service: true, customer: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  // Calculate earnings (assuming 60% engineer cut)
  const engineerRate = 0.6;

  const weeklyTotal = weeklyJobs.reduce((sum, j) => sum + (j.quotedPrice * engineerRate), 0);
  const monthlyTotal = monthlyJobs.reduce((sum, j) => sum + (j.quotedPrice * engineerRate), 0);

  const weeklyJobCount = weeklyJobs.length;
  const monthlyJobCount = monthlyJobs.length;

  const weeklyHours = weeklyJobs.reduce((sum, j) => sum + (j.estimatedDuration || 60), 0) / 60;
  const monthlyHours = monthlyJobs.reduce((sum, j) => sum + (j.estimatedDuration || 60), 0) / 60;

  // Transform recent jobs for display
  const recentJobsData = recentJobs.map((job) => ({
    id: job.id,
    customerName: job.customer.name,
    serviceName: job.service.name,
    completedAt: job.completedAt?.toISOString() || job.updatedAt.toISOString(),
    earnings: job.quotedPrice * engineerRate,
    quotedPrice: job.quotedPrice,
  }));

  return (
    <EarningsClient
      weeklyStats={{
        total: weeklyTotal,
        jobCount: weeklyJobCount,
        hours: Math.round(weeklyHours * 10) / 10,
        avgPerJob: weeklyJobCount > 0 ? weeklyTotal / weeklyJobCount : 0,
        avgPerHour: weeklyHours > 0 ? weeklyTotal / weeklyHours : 0,
      }}
      monthlyStats={{
        total: monthlyTotal,
        jobCount: monthlyJobCount,
        hours: Math.round(monthlyHours * 10) / 10,
        avgPerJob: monthlyJobCount > 0 ? monthlyTotal / monthlyJobCount : 0,
        avgPerHour: monthlyHours > 0 ? monthlyTotal / monthlyHours : 0,
      }}
      recentJobs={recentJobsData}
    />
  );
}
