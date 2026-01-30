import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
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

  // Simple inline queries
  let myJobs: Array<{
    id: string;
    status: string;
    scheduledDate: Date;
    slot: string;
    estimatedQty: number;
    service: { name: string; unitName: string };
    site: { name: string; address: string; postcode: string };
  }> = [];
  let availableJobs: typeof myJobs = [];

  try {
    [myJobs, availableJobs] = await Promise.all([
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
  } catch (e) {
    console.error("Jobs query error:", e);
  }

  const activeJobs = myJobs.filter(
    (j) => j.status === "CONFIRMED" || j.status === "IN_PROGRESS"
  );
  const completedJobs = myJobs.filter((j) => j.status === "COMPLETED");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS": return "bg-yellow-100 text-yellow-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "PENDING": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-gray-500">Manage your assigned and available jobs.</p>
      </div>

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
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No active jobs</p>
              <p className="text-sm">Pick up available jobs to start working.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{job.service.name}</p>
                          <p className="text-sm text-gray-500">{job.site.name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-500">
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
                          <span className="truncate">{job.site.postcode}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {job.estimatedQty} {job.service.unitName}s
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
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
              <p className="font-medium">No available jobs</p>
              <p className="text-sm">Check back later for new jobs.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{job.service.name}</p>
                          <p className="text-sm text-gray-500">{job.site.name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-500">
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
                          <span className="truncate">{job.site.postcode}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {job.estimatedQty} {job.service.unitName}s
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
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
              <p className="font-medium">No completed jobs</p>
              <p className="text-sm">Jobs you complete will appear here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedJobs.map((job) => (
                <Link key={job.id} href={`/engineer/jobs/${job.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{job.service.name}</p>
                          <p className="text-sm text-gray-500">{job.site.name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-500">
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
                          <span className="truncate">{job.site.postcode}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {job.estimatedQty} {job.service.unitName}s
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
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
