import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Calendar, Zap, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scheduling | Admin",
  description: "Manage scheduling settings and view calendar",
};

export default async function SchedulingPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const sections = [
    {
      title: "Control Panel",
      description: "Configure allocation weights, pricing rules, and cluster settings",
      icon: Settings,
      href: "/admin/scheduling/control",
      color: "blue",
    },
    {
      title: "Master Calendar",
      description: "View all engineer schedules and manage bookings visually",
      icon: Calendar,
      href: "/admin/scheduling/calendar",
      color: "green",
    },
    {
      title: "Optimization",
      description: "Run route optimization and view improvement opportunities",
      icon: Zap,
      href: "/admin/scheduling/optimization",
      color: "purple",
    },
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <AdminPage
      title="Scheduling"
      description="Control allocation, routing, and optimization"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      colorClasses[section.color as keyof typeof colorClasses]
                    }`}
                  >
                    <section.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">
                  {section.description}
                </CardDescription>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    section.color === "blue"
                      ? "text-blue-600"
                      : section.color === "green"
                      ? "text-green-600"
                      : "text-purple-600"
                  }`}
                >
                  <span>Open</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Today&apos;s Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm text-gray-500">Scheduled Jobs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-gray-500">Active Engineers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">87%</div>
              <div className="text-sm text-gray-500">Utilization Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">+12%</div>
              <div className="text-sm text-gray-500">Efficiency vs Last Week</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
