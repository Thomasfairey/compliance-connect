import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getAdminDashboardAnalytics } from "@/lib/actions/admin-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared";
import { UtilizationCard } from "@/components/admin/utilization-card";
import { JobsByCategoryCard } from "@/components/admin/jobs-by-category-card";
import { GeographicSalesCard } from "@/components/admin/geographic-sales-card";
import {
  Users,
  Wrench,
  Calendar,
  ArrowRight,
  Briefcase,
  PoundSterling,
  Clock,
  AlertTriangle,
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

  // Fetch analytics data
  const analytics = await getAdminDashboardAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {user.name}. Here&apos;s your business overview.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jobs Today"
          value={analytics.quickStats.todayJobs}
          icon={Briefcase}
          className="bg-blue-50 border-blue-100"
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(analytics.quickStats.todayRevenue)}
          icon={PoundSterling}
          className="bg-green-50 border-green-100"
        />
        <StatCard
          title="Pending"
          value={analytics.quickStats.pendingCount}
          icon={Clock}
          description="Need assignment"
          className={
            analytics.quickStats.pendingCount > 0
              ? "bg-amber-50 border-amber-100"
              : ""
          }
        />
        <StatCard
          title="Overdue"
          value={analytics.quickStats.overdueCount}
          icon={AlertTriangle}
          description="Compliance items"
          className={
            analytics.quickStats.overdueCount > 0
              ? "bg-red-50 border-red-100"
              : ""
          }
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <UtilizationCard data={analytics.utilization} />
        <JobsByCategoryCard data={analytics.jobsByCategory} />
        <GeographicSalesCard data={analytics.geographic} />
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
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
                <p className="text-sm text-gray-500">
                  View and manage all customer bookings
                </p>
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
                <p className="text-sm text-gray-500">
                  Manage engineer accounts and assignments
                </p>
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
                <p className="text-sm text-gray-500">
                  Manage service offerings and pricing
                </p>
                <div className="flex items-center gap-1 text-purple-600 text-sm mt-2">
                  <span>Open</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
