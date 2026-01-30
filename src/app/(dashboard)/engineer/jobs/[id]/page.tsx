import { notFound, redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getBookingById } from "@/lib/actions";

export const dynamic = "force-dynamic";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatPrice, getSlotTime } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  User,
  Package,
  FileText,
  Phone,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobActions } from "@/components/engineer/job-actions";
import { AssetList } from "@/components/engineer/asset-list";
import { AddAssetForm } from "@/components/engineer/add-asset-form";

export const metadata = {
  title: "Job Details",
};

export default async function EngineerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  const isAssignedToMe = booking.engineerId === user.id;
  const canAssign = !booking.engineerId && booking.status === "PENDING";
  const canStart = isAssignedToMe && booking.status === "CONFIRMED";
  const canAddAssets = isAssignedToMe && booking.status === "IN_PROGRESS";
  const canComplete =
    isAssignedToMe &&
    booking.status === "IN_PROGRESS" &&
    booking.assets.length > 0;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${booking.site.address}, ${booking.site.postcode}`
  )}`;

  return (
    <div className="pb-24 lg:pb-8">
      <PageHeader
        title={booking.service.name}
        description={`${booking.site.name} • ${formatDate(booking.scheduledDate)}`}
        backHref="/engineer/jobs"
      />

      {/* Status & Quick Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={booking.status} />
              <span className="text-sm text-gray-500">
                Ref: {booking.reference}
              </span>
            </div>
            <JobActions
              bookingId={booking.id}
              status={booking.status}
              canAssign={canAssign}
              canStart={canStart}
              canComplete={canComplete}
              isAssignedToMe={isAssignedToMe}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.service.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.estimatedQty} {booking.service.unitName}s estimated
                  </p>
                </div>
              </div>
              <Separator />
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
            </CardContent>
          </Card>

          {/* Assets Section */}
          {(canAddAssets || booking.assets.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Test Results ({booking.assets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canAddAssets && (
                  <div className="mb-6">
                    <AddAssetForm
                      bookingId={booking.id}
                      unitName={booking.service.unitName}
                    />
                  </div>
                )}
                <AssetList assets={booking.assets} canEdit={canAddAssets} />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Site Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Site Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{booking.site.name}</p>
                  <p className="text-sm text-gray-500">{booking.site.address}</p>
                  <p className="text-sm text-gray-500">{booking.site.postcode}</p>
                </div>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </a>

              {booking.site.accessNotes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Access Notes
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.site.accessNotes}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.customer.name}
                  </p>
                  {booking.customer.companyName && (
                    <p className="text-sm text-gray-500">
                      {booking.customer.companyName}
                    </p>
                  )}
                </div>
              </div>
              {booking.customer.phone && (
                <a href={`tel:${booking.customer.phone}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Customer
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Price */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Quoted Price</span>
                <span className="text-lg font-semibold">
                  {formatPrice(booking.quotedPrice)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
