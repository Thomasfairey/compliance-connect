import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
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

  // Simple inline queries
  let assignedJobs = 0;
  let inProgressJobs = 0;
  let completedToday = 0;
  let availableJobs = 0;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    [assignedJobs, inProgressJobs, completedToday, availableJobs] = await Promise.all([
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
          status: { in: ["PENDING", "CONFIRMED"] },
          engineerId: null,
        },
      }),
    ]);
  } catch (e) {
    console.error("Engineer dashboard query error:", e);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user.name.split(" ")[0]}
        </h1>
        <p className="text-gray-500">Here&apos;s your work overview.</p>
      </div>

      {/* Simple Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Assigned</p>
                <p className="text-2xl font-bold">{assignedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{inProgressJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold">{completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Wrench className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold">{availableJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                My Jobs
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View all your assigned jobs</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                My Profile
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Update your details</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Schedule
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View your calendar</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
