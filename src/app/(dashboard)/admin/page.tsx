import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Wrench,
  Calendar,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // NO DATABASE QUERIES - completely static page
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user.name}. Manage your platform below.</p>
      </div>

      {/* Quick Links Only - No Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/bookings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">All Bookings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View and manage all customer bookings</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/engineers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Engineers</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Manage engineer accounts and assignments</p>
              <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/services">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Services</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Manage service offerings and pricing</p>
              <div className="flex items-center gap-1 text-purple-600 text-sm mt-2">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Quick Actions</h2>
        <p className="text-sm text-gray-600">
          Use the cards above to navigate to different sections of the admin panel.
          View all bookings to see pending assignments, manage engineers to handle team capacity,
          or update services to modify pricing.
        </p>
      </div>
    </div>
  );
}
