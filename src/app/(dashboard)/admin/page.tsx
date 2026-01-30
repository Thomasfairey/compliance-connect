import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  // Simple inline queries with error handling
  let totalUsers = 0;
  let totalEngineers = 0;
  let totalBookings = 0;
  let pendingBookings = 0;

  try {
    [totalUsers, totalEngineers, totalBookings, pendingBookings] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "ENGINEER" } }),
      db.booking.count(),
      db.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    ]);
  } catch (e) {
    console.error("Dashboard query error:", e);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Manage bookings, engineers, and services.</p>
      </div>

      {/* Simple Stats - No StatCard component */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Wrench className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Engineers</p>
                <p className="text-2xl font-bold">{totalEngineers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{pendingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/bookings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                All Bookings
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View and manage all bookings</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/engineers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Engineers
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Manage engineer accounts</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/services">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Services
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Manage service offerings</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
