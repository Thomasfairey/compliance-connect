import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Plus,
  Building2,
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
