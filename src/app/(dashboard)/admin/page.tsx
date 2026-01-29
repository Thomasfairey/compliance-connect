import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Wrench,
  CheckCircle2,
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

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Manage bookings, engineers, and services."
      />

      <p className="mb-8 text-gray-600">Welcome, {user.name}!</p>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
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
