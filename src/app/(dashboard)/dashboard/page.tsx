import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

// TEMPORARY: Minimal dashboard for debugging
export default async function DashboardPage() {
  const user = await getOrCreateUser();

  if (user.role === "ENGINEER") {
    redirect("/engineer");
  }
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  // Simple data fetch
  const [totalBookings, totalSites] = await Promise.all([
    db.booking.count({ where: { customerId: user.id } }),
    db.site.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome back, {user.name || "there"}!</h1>
      <p className="text-gray-600 mb-4">User ID: {user.id}</p>
      <p className="text-gray-600 mb-4">Email: {user.email}</p>
      <p className="text-gray-600 mb-4">Role: {user.role}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Total Sites</p>
          <p className="text-2xl font-bold">{totalSites}</p>
        </div>
      </div>
      <div className="mt-6">
        <Link href="/bookings/new" className="text-blue-600 hover:underline">
          Book a new test →
        </Link>
      </div>
    </div>
  );
}
