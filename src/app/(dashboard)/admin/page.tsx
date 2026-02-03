import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtilizationCard } from "@/components/admin/utilization-card";
import { JobsByCategoryCard } from "@/components/admin/jobs-by-category-card";
import { GeographicSalesCard } from "@/components/admin/geographic-sales-card";
import { TravelTimeCard } from "@/components/admin/travel-time-card";
import { getAdminDashboardAnalytics } from "@/lib/actions/admin-analytics";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import {
  Briefcase,
  PoundSterling,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Users,
  Zap,
  Download,
  Bell,
  Receipt,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fetch all data in parallel
  const [
    analytics,
    pendingCount,
    urgentBookings,
    overdueCount,
    cancelledToday,
    recentBookings,
    engineerStats,
    weeklyRevenue,
    lastWeekRevenue,
  ] = await Promise.all([
    getAdminDashboardAnalytics(),
    // Pending allocation count
    db.booking.count({
      where: { status: "PENDING", engineerId: null },
    }),
    // Urgent bookings (next 2 days, no engineer)
    db.booking.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
        engineerId: null,
        status: { not: "CANCELLED" },
      },
      include: { service: true, site: true },
      take: 5,
    }),
    // Overdue bookings
    db.booking.count({
      where: {
        scheduledDate: { lt: now },
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      },
    }),
    // Cancelled today
    db.booking.count({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Recent bookings
    db.booking.findMany({
      where: { createdAt: { gte: subDays(now, 7) } },
      include: { service: true, customer: true, site: true, engineer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Engineer stats
    db.user.findMany({
      where: { role: "ENGINEER", engineerProfile: { status: "APPROVED" } },
      include: {
        engineerProfile: true,
        assignments: {
          where: { scheduledDate: { gte: todayStart, lte: todayEnd } },
        },
      },
    }),
    // This week revenue
    db.booking.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: { gte: subDays(now, 7) },
      },
      _sum: { quotedPrice: true },
    }),
    // Last week revenue
    db.booking.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: { gte: subDays(now, 14), lt: subDays(now, 7) },
      },
      _sum: { quotedPrice: true },
    }),
  ]);

  // Calculate revenue change
  const thisWeekRev = weeklyRevenue._sum.quotedPrice || 0;
  const lastWeekRev = lastWeekRevenue._sum.quotedPrice || 0;
  const revenueChange = lastWeekRev > 0
    ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100)
    : 0;

  // Build alerts
  const alerts = [];
  if (urgentBookings.length > 0) {
    alerts.push({
      type: "error",
      title: `${urgentBookings.length} urgent bookings need allocation`,
      description: "Bookings in the next 2 days without an engineer",
      href: "/admin/scheduling/calendar?filter=unallocated",
    });
  }
  if (overdueCount > 0) {
    alerts.push({
      type: "warning",
      title: `${overdueCount} overdue bookings`,
      description: "Past scheduled date and not completed",
      href: "/admin/bookings/issues",
    });
  }
  if (cancelledToday > 0) {
    alerts.push({
      type: "info",
      title: `${cancelledToday} booking${cancelledToday > 1 ? "s" : ""} cancelled today`,
      description: "Review cancellation reasons",
      href: "/admin/bookings/issues",
    });
  }

  // Active engineers today
  const activeEngineers = engineerStats.filter((e) => e.assignments.length > 0);

  return (
    <AdminPage
      title="Dashboard"
      description={`Welcome back, ${user.name}. Here's your business overview.`}
    >
      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, i) => (
            <Link key={i} href={alert.href}>
              <div
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  alert.type === "error"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : alert.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {alert.type === "error" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : alert.type === "warning" ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm opacity-80">{alert.description}</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Jobs Today"
          value={analytics.quickStats.todayJobs}
          icon={Briefcase}
          href="/admin/scheduling/calendar?date=today"
          className="bg-blue-50 border-blue-100"
        />
        <MetricCard
          title="Revenue (7 days)"
          value={formatCurrency(thisWeekRev)}
          change={revenueChange}
          icon={PoundSterling}
          href="/admin/reports"
          className="bg-green-50 border-green-100"
        />
        <MetricCard
          title="Avg Job Price"
          value={formatCurrency(analytics.quickStats.averageJobPrice)}
          change={analytics.quickStats.averageJobPriceChange}
          icon={Receipt}
          href="/admin/reports/revenue"
          className="bg-purple-50 border-purple-100"
        />
        <MetricCard
          title="Pending Allocation"
          value={pendingCount}
          icon={Clock}
          href="/admin/scheduling/calendar?filter=unallocated"
          className={pendingCount > 0 ? "bg-amber-50 border-amber-100" : ""}
          highlight={pendingCount > 0}
        />
        <MetricCard
          title="Active Engineers"
          value={`${activeEngineers.length}/${engineerStats.length}`}
          icon={Users}
          href="/admin/engineers"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <UtilizationCard data={analytics.utilization} />
        <TravelTimeCard data={analytics.travelTime} />
        <JobsByCategoryCard data={analytics.jobsByCategory} />
        <GeographicSalesCard data={analytics.geographic} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Bookings</CardTitle>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        booking.status === "COMPLETED"
                          ? "bg-green-500"
                          : booking.status === "CANCELLED"
                          ? "bg-gray-400"
                          : booking.status === "PENDING"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {booking.service.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.customer.name} • {booking.site.postcode}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(booking.quotedPrice || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.scheduledDate
                        ? format(new Date(booking.scheduledDate), "MMM d")
                        : "No date"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                icon={Calendar}
                label="Create Booking"
                href="/admin/bookings/new"
                color="blue"
              />
              <QuickAction
                icon={Zap}
                label="Run Optimization"
                href="/admin/scheduling/optimization"
                color="purple"
              />
              <QuickAction
                icon={Users}
                label="Add Engineer"
                href="/admin/engineers/new"
                color="green"
              />
              <QuickAction
                icon={Download}
                label="Export Reports"
                href="/admin/reports"
                color="amber"
              />
            </div>

            {/* Pending Actions Preview */}
            {urgentBookings.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Needs Attention
                </h4>
                <div className="space-y-2">
                  {urgentBookings.slice(0, 3).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center justify-between p-2 rounded bg-red-50 text-red-800 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {booking.service.name} - {booking.site.postcode}
                      </span>
                      <span className="text-xs">
                        {booking.scheduledDate
                          ? format(new Date(booking.scheduledDate), "MMM d")
                          : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  href,
  className,
  highlight,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: typeof Briefcase;
  href: string;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer ${className || ""}`}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{title}</p>
              <p
                className={`text-2xl font-semibold mt-1 ${
                  highlight ? "text-amber-600" : ""
                }`}
              >
                {value}
              </p>
            </div>
            <div className="p-2 bg-white/50 rounded-lg">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"
              }`}
            >
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : change < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : null}
              <span>
                {change > 0 && "+"}
                {change}% vs last week
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: typeof Calendar;
  label: string;
  href: string;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    green: "bg-green-50 text-green-600 hover:bg-green-100",
    purple: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    amber: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${colorClasses[color]}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
