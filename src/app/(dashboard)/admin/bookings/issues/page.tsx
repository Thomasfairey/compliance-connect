import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  AlertTriangle,
  Clock,
  XCircle,
  CalendarX,
} from "lucide-react";
import type { Booking, Service, Site, User } from "@prisma/client";

type IssueBooking = Booking & {
  service: Service;
  site: Site;
  customer: User;
  engineer?: User | null;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Issues & Escalations | Admin",
  description: "Bookings requiring attention",
};

export default async function IssuesPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();

  // Get various issue types
  const [overdue, cancelled, noEngineer, pastUnconfirmed] = await Promise.all([
    // Overdue bookings (past date, not completed)
    db.booking.findMany({
      where: {
        scheduledDate: { lt: now },
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      },
      include: {
        service: true,
        site: true,
        customer: true,
        engineer: true,
      },
      orderBy: { scheduledDate: "desc" },
      take: 20,
    }),
    // Recently cancelled
    db.booking.findMany({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        service: true,
        site: true,
        customer: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    // Upcoming without engineer
    db.booking.findMany({
      where: {
        scheduledDate: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
        engineerId: null,
        status: { not: "CANCELLED" },
      },
      include: {
        service: true,
        site: true,
        customer: true,
      },
      orderBy: { scheduledDate: "asc" },
    }),
    // Unconfirmed past due
    db.booking.findMany({
      where: {
        scheduledDate: { gte: now },
        status: "PENDING",
        createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      include: {
        service: true,
        site: true,
        customer: true,
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  const totalIssues = overdue.length + cancelled.length + noEngineer.length + pastUnconfirmed.length;

  return (
    <AdminPage
      title="Issues & Escalations"
      description={`${totalIssues} issues requiring attention`}
    >
      {/* Issue Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className={overdue.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CalendarX className={`w-5 h-5 ${overdue.length > 0 ? "text-red-600" : "text-gray-400"}`} />
              <div className={`text-2xl font-bold ${overdue.length > 0 ? "text-red-600" : "text-gray-400"}`}>
                {overdue.length}
              </div>
            </div>
            <div className="text-sm text-gray-500">Overdue</div>
          </CardContent>
        </Card>
        <Card className={noEngineer.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${noEngineer.length > 0 ? "text-amber-600" : "text-gray-400"}`} />
              <div className={`text-2xl font-bold ${noEngineer.length > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {noEngineer.length}
              </div>
            </div>
            <div className="text-sm text-gray-500">No Engineer (3 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{pastUnconfirmed.length}</div>
            </div>
            <div className="text-sm text-gray-500">Stale Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-gray-500" />
              <div className="text-2xl font-bold text-gray-500">{cancelled.length}</div>
            </div>
            <div className="text-sm text-gray-500">Cancelled (7 days)</div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <IssueSection
          title="Overdue Bookings"
          description="These bookings are past their scheduled date and not completed"
          icon={CalendarX}
          iconColor="text-red-600"
          bookings={overdue}
          showEngineer
        />
      )}

      {/* No Engineer Section */}
      {noEngineer.length > 0 && (
        <IssueSection
          title="Upcoming Without Engineer"
          description="Bookings in the next 3 days without an assigned engineer"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          bookings={noEngineer}
          actionLabel="Allocate"
        />
      )}

      {/* Stale Pending Section */}
      {pastUnconfirmed.length > 0 && (
        <IssueSection
          title="Stale Pending Bookings"
          description="Pending for more than 24 hours without confirmation"
          icon={Clock}
          iconColor="text-blue-600"
          bookings={pastUnconfirmed}
        />
      )}

      {/* Cancelled Section */}
      {cancelled.length > 0 && (
        <IssueSection
          title="Recently Cancelled"
          description="Bookings cancelled in the last 7 days"
          icon={XCircle}
          iconColor="text-gray-500"
          bookings={cancelled}
        />
      )}

      {totalIssues === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-green-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Issues</h3>
            <p className="text-gray-500 mt-2">
              Everything is running smoothly. No bookings require attention.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminPage>
  );
}

function IssueSection({
  title,
  description,
  icon: Icon,
  iconColor,
  bookings,
  showEngineer,
  actionLabel = "View",
}: {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  iconColor: string;
  bookings: IssueBooking[];
  showEngineer?: boolean;
  actionLabel?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                {showEngineer && <TableHead>Engineer</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-sm">
                    {booking.reference}
                  </TableCell>
                  <TableCell>{booking.service.name}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{booking.customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {booking.site?.postcode}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.scheduledDate
                      ? format(new Date(booking.scheduledDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  {showEngineer && (
                    <TableCell>
                      {booking.engineer?.name || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        booking.status === "CANCELLED"
                          ? "bg-gray-100 text-gray-600"
                          : booking.status === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/bookings/${booking.id}`}>
                      <Button size="sm" variant="outline">
                        {actionLabel}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
