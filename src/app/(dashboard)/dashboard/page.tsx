import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
  AlertTriangle,
} from "lucide-react";
import { BundlePromoCard } from "@/components/dashboard/bundle-promo-card";
import { getComplianceStatus } from "@/lib/actions/compliance";

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

  // Fetch customer data
  const [totalBookings, pendingBookings, completedBookings, totalSites, bookings, bundles, complianceStatuses] =
    await Promise.all([
      db.booking.count({ where: { customerId: user.id } }),
      db.booking.count({
        where: { customerId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      db.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
      db.site.count({ where: { userId: user.id } }),
      db.booking.findMany({
        where: { customerId: user.id },
        include: {
          site: true,
          service: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.serviceBundle.findMany({
        where: { isActive: true },
        select: { discountPercent: true },
      }),
      getComplianceStatus(),
    ]);

  // Calculate max bundle discount
  const maxBundleDiscount = bundles.length > 0
    ? Math.max(...bundles.map((b) => b.discountPercent))
    : 25;

  const overdueItems = complianceStatuses.filter((s) => s.status === "OVERDUE");
  const dueSoonItems = complianceStatuses.filter((s) => s.status === "DUE_SOON");
  const urgentItems = [...overdueItems, ...dueSoonItems];

  const recentBookings = bookings.slice(0, 5);
  const upcomingBookings = bookings.filter(
    (b) =>
      (b.status === "PENDING" || b.status === "CONFIRMED") &&
      new Date(b.scheduledDate) >= new Date()
  );

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name?.split(" ")[0] || "there"}`}
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

      {/* Compliance Urgency + Book a Test CTA */}
      {urgentItems.length > 0 ? (
        <div className="mb-8 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-amber-50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  {overdueItems.length > 0
                    ? `${overdueItems.length} Overdue Test${overdueItems.length > 1 ? "s" : ""}`
                    : `${dueSoonItems.length} Test${dueSoonItems.length > 1 ? "s" : ""} Due Soon`}
                </h2>
              </div>
              <div className="space-y-1">
                {urgentItems.slice(0, 3).map((item) => (
                  <p key={`${item.siteId}-${item.serviceId}`} className="text-sm text-gray-600">
                    <span className="font-medium">{item.serviceName}</span>
                    {" at "}{item.siteName}
                    {" — "}
                    <span className={item.status === "OVERDUE" ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                      {item.status === "OVERDUE"
                        ? `${Math.abs(item.daysUntilDue)} days overdue`
                        : `due in ${item.daysUntilDue} days`}
                    </span>
                  </p>
                ))}
                {urgentItems.length > 3 && (
                  <Link href="/compliance" className="text-sm text-blue-600 hover:underline">
                    + {urgentItems.length - 3} more...
                  </Link>
                )}
              </div>
            </div>
            <Link href="/bookings/new" className="shrink-0">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Book a Test Now
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">All Compliant</h2>
              </div>
              <p className="text-sm text-gray-600">All your compliance tests are up to date.</p>
            </div>
            <Link href="/bookings/new" className="shrink-0">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Book a Test
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Bookings" value={totalBookings} icon={Calendar} />
        <StatCard title="Pending" value={pendingBookings} icon={Clock} />
        <StatCard title="Completed" value={completedBookings} icon={CheckCircle2} />
        <StatCard title="Sites" value={totalSites} icon={Building2} />
      </div>

      {/* Bundle Promo */}
      {bundles.length > 0 && (
        <BundlePromoCard
          maxDiscount={maxBundleDiscount}
          bundleCount={bundles.length}
        />
      )}

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
                icon={<Calendar className="w-8 h-8 text-gray-400" />}
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
                          {booking.service?.name || "Unknown Service"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.site?.name || "Unknown Site"} • {formatDate(booking.scheduledDate)}
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
                icon={<Clock className="w-8 h-8 text-gray-400" />}
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
                            {booking.service?.name || "Unknown Service"}
                          </p>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {booking.site?.name || "Unknown Site"}
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
