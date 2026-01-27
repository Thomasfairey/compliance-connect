import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getEngineerStats, getEngineerJobs, getAvailableJobs } from "@/lib/actions";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/shared";
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

export const metadata = {
  title: "Engineer Dashboard",
};

export default async function EngineerDashboardPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [stats, myJobs, availableJobs] = await Promise.all([
    getEngineerStats(),
    getEngineerJobs(),
    getAvailableJobs(),
  ]);

  const todaysJobs = myJobs.filter((job) => {
    const today = new Date();
    const jobDate = new Date(job.scheduledDate);
    return (
      jobDate.toDateString() === today.toDateString() &&
      (job.status === "CONFIRMED" || job.status === "IN_PROGRESS")
    );
  });

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
                {availableJobs.slice(0, 5).map((job) => (
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
    </div>
  );
}
