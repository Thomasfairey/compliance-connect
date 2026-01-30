import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getEngineerJobsData } from "@/lib/actions";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, getSlotTime } from "@/lib/utils";
import { ClipboardList, Calendar, Clock, MapPin, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Jobs",
};

export default async function EngineerJobsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { myJobs, availableJobs } = await getEngineerJobsData();

  const activeJobs = myJobs.filter(
    (j) => j.status === "CONFIRMED" || j.status === "IN_PROGRESS"
  );
  const completedJobs = myJobs.filter((j) => j.status === "COMPLETED");

  const JobCard = ({
    job,
    showDate = true,
  }: {
    job: (typeof myJobs)[0];
    showDate?: boolean;
  }) => (
    <Link href={`/engineer/jobs/${job.id}`} className="block">
      <Card className="hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900">{job.service.name}</p>
              <p className="text-sm text-gray-500">{job.site.name}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <div className="space-y-2 text-sm text-gray-500">
            {showDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(job.scheduledDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{getSlotTime(job.slot)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">
                {job.site.address}, {job.site.postcode}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {job.estimatedQty} {job.service.unitName}s
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Manage your assigned and available jobs."
      />

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex-1 sm:flex-none">
            Available ({availableJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-none">
            Completed ({completedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active jobs"
              description="Pick up available jobs to start working."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available">
          {availableJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No available jobs"
              description="Check back later for new jobs."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No completed jobs"
              description="Jobs you complete will appear here."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
