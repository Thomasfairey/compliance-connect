import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, getSlotTime } from "@/lib/utils";
import {
  Wrench,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Dashboard",
};

export default async function EngineerDashboardPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Default values
  let stats = {
    assignedJobs: 0,
    inProgressJobs: 0,
    completedToday: 0,
    completedThisWeek: 0,
  };
  let todaysJobs: {
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    service: { name: string };
    site: { name: string; postcode: string };
  }[] = [];
  let availableJobs: typeof todaysJobs = [];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // Fetch data directly
    const [assignedJobs, inProgressJobs, completedToday, completedThisWeek, todaysJobsData, availableJobsData] =
      await Promise.all([
        db.booking.count({
          where: {
            engineerId: user.id,
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
        }),
        db.booking.count({
          where: { engineerId: user.id, status: "IN_PROGRESS" },
        }),
        db.booking.count({
          where: {
            engineerId: user.id,
            status: "COMPLETED",
            completedAt: { gte: today },
          },
        }),
        db.booking.count({
          where: {
            engineerId: user.id,
            status: "COMPLETED",
            completedAt: { gte: weekStart },
          },
        }),
        db.booking.findMany({
          where: {
            engineerId: user.id,
            scheduledDate: { gte: today, lt: tomorrow },
            status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          },
          include: {
            service: true,
            site: true,
          },
          orderBy: { scheduledDate: "asc" },
        }),
        db.booking.findMany({
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            engineerId: null,
          },
          include: {
            service: true,
            site: true,
          },
          orderBy: { scheduledDate: "asc" },
          take: 5,
        }),
      ]);

    stats = {
      assignedJobs,
      inProgressJobs,
      completedToday,
      completedThisWeek,
    };

    todaysJobs = todaysJobsData;
    availableJobs = availableJobsData;
  } catch (error) {
    console.error("Error fetching engineer dashboard data:", error);
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Here's your work overview."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Assigned"
          value={stats.assignedJobs}
          icon={Calendar}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressJobs}
          icon={Clock}
        />
        <StatCard
          title="Today"
          value={stats.completedToday}
          icon={CheckCircle2}
        />
        <StatCard
          title="This Week"
          value={stats.completedThisWeek}
          icon={Wrench}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today&apos;s Jobs</CardTitle>
            <Link href="/engineer/jobs">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todaysJobs.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No jobs scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/engineer/jobs/${job.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.99]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {job.service.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {job.site.name}
                          </p>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{getSlotTime(job.slot)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{job.site.postcode}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Available Jobs</CardTitle>
            <span className="text-sm text-gray-500">
              {availableJobs.length} available
            </span>
          </CardHeader>
          <CardContent>
            {availableJobs.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No jobs available right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/engineer/jobs/${job.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.99]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {job.service.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {job.site.name}
                          </p>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(job.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{job.site.postcode}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Jobs</h3>
                <p className="text-sm text-gray-500">View all assigned jobs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/profile">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Profile</h3>
                <p className="text-sm text-gray-500">Update your details</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Schedule</h3>
                <p className="text-sm text-gray-500">View your calendar</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
