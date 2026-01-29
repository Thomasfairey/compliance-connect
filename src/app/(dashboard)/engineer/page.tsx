import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wrench,
  Calendar,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Dashboard",
};

export default async function EngineerDashboardPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Here's your work overview."
      />

      <p className="mb-8 text-gray-600">Welcome to the engineer portal!</p>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Jobs</h3>
                <p className="text-sm text-gray-500">View assigned jobs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/profile">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Profile</h3>
                <p className="text-sm text-gray-500">Update your details</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/engineer/jobs">
          <Card className="hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Schedule</h3>
                <p className="text-sm text-gray-500">View your calendar</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
