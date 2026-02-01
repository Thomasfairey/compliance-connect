import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Ban,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const engineer = await db.user.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: engineer ? `${engineer.name} | Engineers` : "Engineer Details",
  };
}

export default async function EngineerDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const engineer = await db.user.findUnique({
    where: { id, role: "ENGINEER" },
    include: {
      engineerProfile: {
        include: {
          competencies: { include: { service: true } },
          coverageAreas: true,
        },
      },
      assignments: {
        where: { scheduledDate: { gte: subDays(new Date(), 90) } },
        include: { service: true, site: true },
        orderBy: { scheduledDate: "desc" },
      },
    },
  });

  if (!engineer || !engineer.engineerProfile) {
    notFound();
  }

  const profile = engineer.engineerProfile;
  const now = new Date();

  // Calculate stats
  const completedJobs = engineer.assignments.filter((a) => a.status === "COMPLETED");
  const totalJobs = engineer.assignments.length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs.length / totalJobs) * 100) : 0;

  // Average rating (placeholder - would come from reviews)
  const avgRating = 4.8;

  // Revenue generated
  const totalRevenue = completedJobs.reduce((sum, job) => sum + (job.quotedPrice || 0), 0);

  // Upcoming jobs
  const upcomingJobs = engineer.assignments.filter(
    (a) => new Date(a.scheduledDate!) >= now && a.status !== "CANCELLED"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>;
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-100 text-amber-800 border-0">Pending</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-100 text-red-800 border-0">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminPage
      title={engineer.name}
      description={`Engineer profile and performance`}
      actions={
        <div className="flex gap-2">
          {profile.status === "APPROVED" ? (
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : profile.status === "SUSPENDED" ? (
            <Button variant="outline" className="text-green-600 hover:text-green-700">
              <UserCheck className="w-4 h-4 mr-2" />
              Reactivate
            </Button>
          ) : null}
          <Button>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      }
    >
      {/* Back Button */}
      <Link href="/admin/engineers" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Engineers
      </Link>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalJobs}</div>
                <div className="text-sm text-gray-500">Jobs (90 days)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="text-sm text-gray-500">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgRating}</div>
                <div className="text-sm text-gray-500">Avg Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  £{Math.round(totalRevenue).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Revenue (90 days)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile</CardTitle>
              {getStatusBadge(profile.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-semibold text-blue-600">
                {engineer.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-lg">{engineer.name}</div>
                <div className="text-sm text-gray-500">Engineer</div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{engineer.email}</span>
              </div>
              {engineer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{engineer.phone}</span>
                </div>
              )}
              {profile.coverageAreas.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{profile.coverageAreas[0].postcodePrefix}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Joined {format(new Date(engineer.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Competencies */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Competencies</h4>
              <div className="flex flex-wrap gap-1">
                {profile.competencies.map((comp) => (
                  <Badge key={comp.id} variant="secondary" className="text-xs">
                    {comp.service.name}
                  </Badge>
                ))}
                {profile.competencies.length === 0 && (
                  <span className="text-sm text-gray-500">No competencies set</span>
                )}
              </div>
            </div>

            {/* Coverage Areas */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Coverage Areas</h4>
              <div className="flex flex-wrap gap-1">
                {profile.coverageAreas.map((area) => (
                  <Badge key={area.id} variant="outline" className="text-xs">
                    {area.postcodePrefix} ({area.radiusKm}km)
                  </Badge>
                ))}
                {profile.coverageAreas.length === 0 && (
                  <span className="text-sm text-gray-500">No coverage areas set</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Upcoming Jobs</CardTitle>
              <Link href={`/admin/scheduling/calendar?engineer=${id}`}>
                <Button variant="ghost" size="sm">View Calendar</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingJobs.length > 0 ? (
                <div className="space-y-2">
                  {upcomingJobs.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href={`/admin/bookings/${job.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{job.service.name}</div>
                          <div className="text-xs text-gray-500">
                            {job.site.postcode} • {job.slot}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {format(new Date(job.scheduledDate!), "MMM d")}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            job.status === "CONFIRMED"
                              ? "bg-green-50 text-green-700 border-0"
                              : "bg-amber-50 text-amber-700 border-0"
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No upcoming jobs scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {completedJobs.length > 0 ? (
                <div className="space-y-2">
                  {completedJobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{job.service.name}</div>
                          <div className="text-xs text-gray-500">{job.site.postcode}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          £{(job.quotedPrice || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(job.scheduledDate!), "MMM d")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
