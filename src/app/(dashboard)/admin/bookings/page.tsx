import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getAllBookings } from "@/lib/actions";

export const dynamic = "force-dynamic";
import { PageHeader, StatusBadge } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "All Bookings",
};

export default async function AdminBookingsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const bookings = await getAllBookings();

  return (
    <div>
      <PageHeader
        title="All Bookings"
        description={`${bookings.length} total bookings`}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.reference}
                    </TableCell>
                    <TableCell>{booking.service.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.customer.name}</p>
                        <p className="text-sm text-gray-500">
                          {booking.customer.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{booking.site.name}</p>
                        <p className="text-sm text-gray-500">
                          {booking.site.postcode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(booking.scheduledDate)}</TableCell>
                    <TableCell>
                      {booking.engineer?.name || (
                        <span className="text-amber-600">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>{formatPrice(booking.quotedPrice)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
