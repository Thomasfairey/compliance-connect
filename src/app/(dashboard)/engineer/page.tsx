import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  Calendar,
  User,
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

  // NO DATABASE QUERIES - completely static page
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user.name.split(" ")[0]}
        </h1>
        <p className="text-gray-500">Welcome to your engineer dashboard.</p>
      </div>

      {/* Quick Links Only */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">My Jobs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View and manage your assigned jobs</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Schedule</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View your upcoming schedule</p>
              <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/engineer/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">My Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Update your details and settings</p>
              <div className="flex items-center gap-1 text-purple-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Getting Started</h2>
        <p className="text-sm text-gray-600">
          Click on &quot;My Jobs&quot; to see your assigned work and available jobs.
          You can view job details, start jobs, and mark them as complete.
        </p>
      </div>
    </div>
  );
}
