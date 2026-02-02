import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";
import {
  PendingAllocationsClient,
  BookingsTableClient,
} from "@/components/admin/pending-allocations-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pending Allocation | Admin",
  description: "Bookings awaiting engineer assignment",
};

export default async function PendingBookingsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const pendingBookings = await db.booking.findMany({
    where: {
      status: "PENDING",
      engineerId: null,
    },
    include: {
      service: true,
      site: true,
      customer: true,
    },
    orderBy: [
      { scheduledDate: "asc" },
      { createdAt: "asc" },
    ],
  });

  // Group by urgency
  const now = new Date();
  const urgent = pendingBookings.filter((b) => {
    if (!b.scheduledDate) return false;
    const daysUntil = Math.ceil(
      (new Date(b.scheduledDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 2;
  });

  const thisWeek = pendingBookings.filter((b) => {
    if (!b.scheduledDate) return false;
    const daysUntil = Math.ceil(
      (new Date(b.scheduledDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil > 2 && daysUntil <= 7;
  });

  const later = pendingBookings.filter((b) => {
    if (!b.scheduledDate) return false;
    const daysUntil = Math.ceil(
      (new Date(b.scheduledDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil > 7;
  });

  const noDate = pendingBookings.filter((b) => !b.scheduledDate);

  return (
    <AdminPage
      title="Pending Allocation"
      description={`${pendingBookings.length} bookings awaiting engineer assignment`}
      actions={<PendingAllocationsClient bookings={pendingBookings} />}
    >
      {/* Urgency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className={urgent.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {urgent.length > 0 && <AlertTriangle className="w-5 h-5 text-red-600" />}
              <div className="text-2xl font-bold text-red-600">{urgent.length}</div>
            </div>
            <div className="text-sm text-gray-500">Urgent (≤2 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{thisWeek.length}</div>
            <div className="text-sm text-gray-500">This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{later.length}</div>
            <div className="text-sm text-gray-500">Next Week+</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{noDate.length}</div>
            <div className="text-sm text-gray-500">No Date Set</div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Section */}
      {urgent.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Urgent - Needs Immediate Attention
          </h2>
          <Card>
            <CardContent className="p-0">
              <BookingsTableClient bookings={urgent} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* This Week Section */}
      {thisWeek.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            This Week
          </h2>
          <Card>
            <CardContent className="p-0">
              <BookingsTableClient bookings={thisWeek} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Later Section */}
      {later.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Next Week & Beyond</h2>
          <Card>
            <CardContent className="p-0">
              <BookingsTableClient bookings={later} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Date Section */}
      {noDate.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">No Date Set</h2>
          <Card>
            <CardContent className="p-0">
              <BookingsTableClient bookings={noDate} />
            </CardContent>
          </Card>
        </div>
      )}

      {pendingBookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-4">
              <Clock className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Pending Bookings</h3>
            <p className="text-gray-500 mt-2">
              All bookings have been allocated to engineers.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminPage>
  );
}
