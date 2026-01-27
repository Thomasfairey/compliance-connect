"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  MapPin,
  User,
  Wrench,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageHeader, StatusBadge, PageLoading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  getBookingById,
  getAllEngineers,
  assignEngineerToBooking,
  updateBookingStatus,
} from "@/lib/actions";
import { formatDate, formatPrice } from "@/lib/utils";
import type { BookingWithRelations } from "@/types";
import type { User as UserType, BookingStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AdminBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingWithRelations | null>(null);
  const [engineers, setEngineers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningEngineer, setAssigningEngineer] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "">("");

  useEffect(() => {
    async function loadData() {
      try {
        const [bookingData, engineersData] = await Promise.all([
          getBookingById(bookingId),
          getAllEngineers(),
        ]);

        if (bookingData) {
          setBooking(bookingData);
          setSelectedEngineerId(bookingData.engineerId || "");
          setSelectedStatus(bookingData.status);
        } else {
          toast.error("Booking not found");
          router.push("/admin/bookings");
        }

        setEngineers(engineersData);
      } catch {
        toast.error("Failed to load booking");
        router.push("/admin/bookings");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId, router]);

  async function handleAssignEngineer() {
    if (!selectedEngineerId) {
      toast.error("Please select an engineer");
      return;
    }

    setAssigningEngineer(true);
    try {
      const result = await assignEngineerToBooking(bookingId, selectedEngineerId);
      if (result.success) {
        const updatedBooking = await getBookingById(bookingId);
        if (updatedBooking) {
          setBooking(updatedBooking);
          setSelectedStatus(updatedBooking.status);
        }
        toast.success("Engineer assigned successfully!");
      } else {
        toast.error(result.error || "Failed to assign engineer");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setAssigningEngineer(false);
    }
  }

  async function handleUpdateStatus() {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    setUpdatingStatus(true);
    try {
      const result = await updateBookingStatus(bookingId, selectedStatus);
      if (result.success) {
        const updatedBooking = await getBookingById(bookingId);
        if (updatedBooking) {
          setBooking(updatedBooking);
        }
        toast.success("Status updated successfully!");
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (!booking) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title={`Booking ${booking.reference}`}
        description="Manage booking details and assignments."
        backHref="/admin/bookings"
        action={
          <StatusBadge status={booking.status} />
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Service Type
                  </h3>
                  <p className="text-gray-900 font-medium">
                    {booking.service.name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Estimated Quantity
                  </h3>
                  <p className="text-gray-900">{booking.estimatedQty} items</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Quoted Price
                  </h3>
                  <p className="text-gray-900 font-medium text-lg">
                    {formatPrice(booking.quotedPrice)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Time Slot
                  </h3>
                  <p className="text-gray-900">
                    {booking.slot === "AM" ? "Morning (8am - 12pm)" : "Afternoon (12pm - 5pm)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Scheduled Date
                  </h3>
                  <p className="text-gray-900">{formatDate(booking.scheduledDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Site
                  </h3>
                  <p className="text-gray-900 font-medium">{booking.site.name}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Address
                </h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                  <div>
                    <p className="text-gray-900">{booking.site.address}</p>
                    <p className="text-gray-900">{booking.site.postcode}</p>
                  </div>
                </div>
              </div>
              {booking.site.accessNotes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Access Notes
                  </h3>
                  <p className="text-gray-600">{booking.site.accessNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                  <p className="text-gray-900">{booking.customer.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-gray-900">{booking.customer.email}</p>
                </div>
                {booking.customer.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
                    <p className="text-gray-900">{booking.customer.phone}</p>
                  </div>
                )}
                {booking.customer.companyName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Company</h3>
                    <p className="text-gray-900">{booking.customer.companyName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(booking.notes || booking.engineerNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Customer Notes
                    </h3>
                    <p className="text-gray-600">{booking.notes}</p>
                  </div>
                )}
                {booking.engineerNotes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Engineer Notes
                    </h3>
                    <p className="text-gray-600">{booking.engineerNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    Created on{" "}
                    {new Date(booking.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {booking.startedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">
                      Started on{" "}
                      {new Date(booking.startedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {booking.completedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">
                      Completed on{" "}
                      {new Date(booking.completedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {booking.status === "CANCELLED" && (
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-600">Cancelled</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions Sidebar */}
        <div className="space-y-6">
          {/* Engineer Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assign Engineer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="engineer">Engineer</Label>
                <Select
                  value={selectedEngineerId}
                  onValueChange={setSelectedEngineerId}
                >
                  <SelectTrigger id="engineer">
                    <SelectValue placeholder="Select an engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No engineers available
                      </SelectItem>
                    ) : (
                      engineers.map((engineer) => (
                        <SelectItem key={engineer.id} value={engineer.id}>
                          {engineer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {booking.engineer && (
                <div className="text-sm text-gray-600">
                  Currently assigned:{" "}
                  <span className="font-medium">{booking.engineer.name}</span>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAssignEngineer}
                disabled={assigningEngineer || !selectedEngineerId}
              >
                {assigningEngineer && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {booking.engineer ? "Reassign Engineer" : "Assign Engineer"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) =>
                    setSelectedStatus(value as BookingStatus)
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleUpdateStatus}
                disabled={updatingStatus || selectedStatus === booking.status}
              >
                {updatingStatus && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Certificate */}
          {booking.uploadedDocsUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => window.open(booking.uploadedDocsUrl!, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Certificate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
