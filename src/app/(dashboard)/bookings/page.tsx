import Link from "next/link";
import { getCustomerBookings } from "@/lib/actions";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatPrice, getSlotTime } from "@/lib/utils";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import type { BookingWithRelations } from "@/types";

export const metadata = {
  title: "Bookings",
};

export const dynamic = "force-dynamic";

function BookingCard({ booking }: { booking: BookingWithRelations }) {
  return (
    <Link href={`/bookings/${booking.id}`} className="block">
      <Card className="hover:shadow-md hover:border-gray-200 transition-all">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {booking.service.name}
                </h3>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{booking.site.name}</p>
              <p className="text-sm text-gray-500">{booking.site.address}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-gray-500">
                  {formatDate(booking.scheduledDate)}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{getSlotTime(booking.slot)}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(booking.quotedPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="sm">
                View Details
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BookingsList({
  items,
  emptyMessage,
}: {
  items: BookingWithRelations[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No bookings found"
        description={emptyMessage}
        actionLabel="Book Now"
        actionHref="/bookings/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}

export default async function BookingsPage() {
  const bookings = await getCustomerBookings();

  const pending = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED"
  );
  const inProgress = bookings.filter((b) => b.status === "IN_PROGRESS");
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Manage your compliance testing bookings."
        action={
          <Link href="/bookings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">
            Upcoming ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <BookingsList
            items={pending}
            emptyMessage="You have no upcoming bookings. Book a compliance test to get started."
          />
        </TabsContent>

        <TabsContent value="in-progress">
          <BookingsList
            items={inProgress}
            emptyMessage="No tests are currently in progress."
          />
        </TabsContent>

        <TabsContent value="completed">
          <BookingsList
            items={completed}
            emptyMessage="You haven't completed any tests yet."
          />
        </TabsContent>

        <TabsContent value="cancelled">
          <BookingsList
            items={cancelled}
            emptyMessage="No cancelled bookings."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
