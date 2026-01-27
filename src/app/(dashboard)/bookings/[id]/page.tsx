import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/actions";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDate,
  formatDateTime,
  formatPrice,
  getSlotTime,
} from "@/lib/utils";
import {
  Calendar,
  MapPin,
  User,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

export const metadata = {
  title: "Booking Details",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  const canCancel =
    booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div>
      <PageHeader
        title={`Booking ${booking.reference}`}
        description={`${booking.service.name} at ${booking.site.name}`}
        backHref="/bookings"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Status</p>
                  <StatusBadge status={booking.status} />
                </div>
                {booking.status === "COMPLETED" && booking.certificateUrl && (
                  <a
                    href={booking.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button>
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.service.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.service.description}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Estimated Quantity</p>
                  <p className="font-medium">
                    {booking.estimatedQty} {booking.service.unitName}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quoted Price</p>
                  <p className="font-medium text-lg">
                    {formatPrice(booking.quotedPrice)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDate(booking.scheduledDate)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getSlotTime(booking.slot)}
                  </p>
                </div>
              </div>
              {booking.engineer && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Assigned Engineer</p>
                      <p className="font-medium text-gray-900">
                        {booking.engineer.name}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Site Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Site Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.site.name}
                  </p>
                  <p className="text-sm text-gray-500">{booking.site.address}</p>
                  <p className="text-sm text-gray-500">
                    {booking.site.postcode}
                  </p>
                </div>
              </div>
              {booking.site.accessNotes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Access Notes</p>
                      <p className="text-gray-900">{booking.site.accessNotes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Test Results (if completed) */}
          {booking.status === "COMPLETED" && booking.assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {booking.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{asset.name}</p>
                        <p className="text-sm text-gray-500">{asset.location}</p>
                      </div>
                      <StatusBadge status={asset.status} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Tested</span>
                    <span className="font-medium">{booking.assets.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Passed</span>
                    <span className="font-medium text-green-600">
                      {booking.assets.filter((a) => a.status === "PASS").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Failed</span>
                    <span className="font-medium text-red-600">
                      {booking.assets.filter((a) => a.status === "FAIL").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-gray-900">Booking Created</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                </div>

                {booking.status !== "PENDING" && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      {booking.startedAt && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-gray-900">
                        Engineer Assigned
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.engineer?.name || "Pending"}
                      </p>
                    </div>
                  </div>
                )}

                {booking.startedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-purple-600" />
                      </div>
                      {booking.completedAt && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-gray-900">Work Started</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(booking.startedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {booking.completedAt && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Completed</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(booking.completedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Engineer Notes */}
          {booking.engineerNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engineer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{booking.engineerNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canCancel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <CancelBookingButton bookingId={booking.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
