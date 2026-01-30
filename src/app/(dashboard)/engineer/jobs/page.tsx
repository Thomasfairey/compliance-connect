import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, getSlotTime } from "@/lib/utils";
import { ClipboardList, Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Jobs",
};

export default async function EngineerJobsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch jobs with error handling
  let myJobs: Array<{
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    estimatedQty: number;
    service: { name: string; unitName: string };
    site: { name: string; postcode: string };
  }> = [];
  let availableJobs: typeof myJobs = [];

  try {
    const [myJobsResult, availableJobsResult] = await Promise.all([
      db.booking.findMany({
        where: { engineerId: user.id },
        include: { service: true, site: true },
        orderBy: { scheduledDate: "asc" },
      }),
      db.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          engineerId: null,
        },
        include: { service: true, site: true },
        orderBy: { scheduledDate: "asc" },
      }),
    ]);
    myJobs = myJobsResult;
    availableJobs = availableJobsResult;
  } catch (e) {
    console.error("Jobs query error:", e);
  }

  const activeJobs = myJobs.filter(
    (j) => j.status === "CONFIRMED" || j.status === "IN_PROGRESS"
  );
  const completedJobs = myJobs.filter((j) => j.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-gray-500">Manage your assigned and available jobs.</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeJobs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active jobs</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <p className="font-semibold">{job.service.name}</p>
                      <p className="text-sm text-gray-500 mb-2">{job.site.name}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(job.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{getSlotTime(job.slot)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{job.site.postcode}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available">
          {availableJobs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No available jobs</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <p className="font-semibold">{job.service.name}</p>
                      <p className="text-sm text-gray-500 mb-2">{job.site.name}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(job.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{getSlotTime(job.slot)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{job.site.postcode}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedJobs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No completed jobs</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <p className="font-semibold">{job.service.name}</p>
                      <p className="text-sm text-gray-500 mb-2">{job.site.name}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(job.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{job.site.postcode}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
