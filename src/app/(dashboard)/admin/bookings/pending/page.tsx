import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, MapPin, AlertTriangle, Zap, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pending Allocation | Admin",
  description: "Bookings awaiting engineer assignment",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(amount);
}

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
      actions={
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          Auto-Allocate All
        </Button>
      }
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
          <BookingsTable bookings={urgent} />
        </div>
      )}

      {/* This Week Section */}
      {thisWeek.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            This Week
          </h2>
          <BookingsTable bookings={thisWeek} />
        </div>
      )}

      {/* Later Section */}
      {later.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Next Week & Beyond</h2>
          <BookingsTable bookings={later} />
        </div>
      )}

      {/* No Date Section */}
      {noDate.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">No Date Set</h2>
          <BookingsTable bookings={noDate} />
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

function BookingsTable({ bookings }: { bookings: any[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-sm">
                  {booking.reference}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{booking.service.name}</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {booking.customer.companyName}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {booking.site.postcode}
                  </div>
                </TableCell>
                <TableCell>
                  {booking.scheduledDate ? (
                    <div>
                      <div>{format(new Date(booking.scheduledDate), "EEE, MMM d")}</div>
                      <div className="text-sm text-gray-500">{booking.slot}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  {formatCurrency(booking.price || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline">
                      Allocate
                    </Button>
                    <Link href={`/admin/bookings/${booking.id}`}>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
