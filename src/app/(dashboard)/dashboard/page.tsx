import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getCustomerDashboardData } from "@/lib/actions";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPrice, getSlotTime } from "@/lib/utils";
import {
  Calendar,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getOrCreateUser();

  // Redirect engineers and admins to their respective dashboards
  if (user.role === "ENGINEER") {
    redirect("/engineer");
  }
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const { stats, recentBookings, upcomingBookings } = await getCustomerDashboardData();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Here's an overview of your compliance testing."
        action={
          <Link href="/bookings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Calendar}
        />
        <StatCard
          title="Pending"
          value={stats.pendingBookings}
          icon={Clock}
        />
        <StatCard
          title="Completed"
          value={stats.completedBookings}
          icon={CheckCircle2}
        />
        <StatCard
          title="Sites"
          value={stats.totalSites}
          icon={Building2}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
            <Link href="/bookings">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming bookings"
                description="Book a compliance test to get started."
                actionLabel="Book Now"
                actionHref="/bookings/new"
              />
            ) : (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.service.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.site.name} • {formatDate(booking.scheduledDate)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getSlotTime(booking.slot)}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Your booking history will appear here."
              />
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {booking.service.name}
                          </p>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {booking.site.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatPrice(booking.quotedPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDate(booking.scheduledDate)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/bookings/new">
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-4">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Book a Test</h3>
              <p className="text-sm text-gray-500 mt-1">
                Schedule a new compliance test
              </p>
            </div>
          </Link>
          <Link href="/sites/new">
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Add a Site</h3>
              <p className="text-sm text-gray-500 mt-1">
                Register a new location
              </p>
            </div>
          </Link>
          <Link href="/bookings">
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">View Bookings</h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage your test schedule
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
