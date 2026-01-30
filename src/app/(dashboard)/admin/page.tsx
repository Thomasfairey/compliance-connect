import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/actions";
import { PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Users,
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  PoundSterling,
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

  const { stats, recentBookings, unassignedBookings } = await getAdminDashboardData();

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Manage bookings, engineers, and services."
      />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard
          title="Engineers"
          value={stats.totalEngineers}
          icon={Wrench}
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Calendar}
        />
        <StatCard title="Pending" value={stats.pendingBookings} icon={Clock} />
        <StatCard
          title="Completed"
          value={stats.completedBookings}
          icon={CheckCircle2}
        />
        <StatCard
          title="Revenue"
          value={formatPrice(stats.revenue)}
          icon={PoundSterling}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unassigned Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              Unassigned Bookings ({unassignedBookings.length})
            </CardTitle>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {unassignedBookings.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>All bookings are assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedBookings.slice(0, 5).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.service.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {booking.customer.name}
                          </p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-gray-500">
                        {booking.site.name} • {formatDate(booking.scheduledDate)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.service.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {booking.customer.name}
                          </p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{formatDate(booking.scheduledDate)}</span>
                        <span className="font-medium">
                          {formatPrice(booking.quotedPrice)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Link href="/admin/bookings">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">All Bookings</h3>
                <p className="text-sm text-gray-500">Manage all bookings</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/engineers">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Engineers</h3>
                <p className="text-sm text-gray-500">Manage engineer accounts</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/services">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Services</h3>
                <p className="text-sm text-gray-500">Manage service offerings</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
