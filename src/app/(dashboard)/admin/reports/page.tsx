import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  Map,
  Calendar,
  Download,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports | Admin",
  description: "View analytics and generate reports",
};

const reportTypes = [
  {
    title: "Revenue Report",
    description: "Monthly and yearly revenue breakdown by service and region",
    icon: TrendingUp,
    href: "/admin/reports/revenue",
    color: "green",
  },
  {
    title: "Engineer Performance",
    description: "Individual engineer metrics, ratings, and utilization",
    icon: Users,
    href: "/admin/reports/engineers",
    color: "blue",
  },
  {
    title: "Booking Analytics",
    description: "Booking trends, completion rates, and cancellation analysis",
    icon: Calendar,
    href: "/admin/reports/bookings",
    color: "purple",
  },
  {
    title: "Geographic Insights",
    description: "Performance by region, coverage gaps, and expansion opportunities",
    icon: Map,
    href: "/admin/reports/geographic",
    color: "amber",
  },
];

const colorClasses = {
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
};

export default async function ReportsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Reports"
      description="View analytics and generate reports"
      actions={
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      }
    >
      {/* Report Types */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {reportTypes.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      colorClasses[report.color as keyof typeof colorClasses]
                    }`}
                  >
                    <report.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
                <div
                  className={`flex items-center gap-1 text-sm mt-3 ${
                    report.color === "green"
                      ? "text-green-600"
                      : report.color === "blue"
                      ? "text-blue-600"
                      : report.color === "purple"
                      ? "text-purple-600"
                      : "text-amber-600"
                  }`}
                >
                  <span>View Report</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <h2 className="text-lg font-semibold mb-4">This Month&apos;s Highlights</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">234</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="text-green-600 text-sm font-medium">+12%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">£45,230</div>
                <div className="text-sm text-gray-500">Revenue</div>
              </div>
              <div className="text-green-600 text-sm font-medium">+8%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">94%</div>
                <div className="text-sm text-gray-500">Completion Rate</div>
              </div>
              <div className="text-green-600 text-sm font-medium">+2%</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">4.8</div>
                <div className="text-sm text-gray-500">Avg. Rating</div>
              </div>
              <div className="text-gray-500 text-sm font-medium">-</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Detailed analytics charts will appear here</p>
          <p className="text-sm mt-2">
            Coming soon: Interactive charts, custom date ranges, and PDF exports
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
