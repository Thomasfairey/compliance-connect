"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  MapPin,
  ExternalLink,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  reference: string;
  scheduledDate: Date | null;
  slot: string;
  quotedPrice: number;
  service: { name: string };
  site: { postcode: string };
  customer: { name: string; companyName: string | null };
}

interface AllocationResult {
  bookingId: string;
  success: boolean;
  engineerName?: string;
  error?: string;
  score?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PendingAllocationsClient({
  bookings,
}: {
  bookings: Booking[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allocatingAll, setAllocatingAll] = useState(false);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [results, setResults] = useState<AllocationResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  const allocateSingle = async (bookingId: string) => {
    setAllocatingId(bookingId);
    try {
      const response = await fetch("/api/admin/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Allocated to ${data.engineerName}`);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || "Allocation failed");
      }
    } catch (error) {
      toast.error("Failed to allocate booking");
    } finally {
      setAllocatingId(null);
    }
  };

  const allocateAll = async () => {
    if (bookings.length === 0) {
      toast.info("No bookings to allocate");
      return;
    }

    setAllocatingAll(true);
    setResults([]);
    const newResults: AllocationResult[] = [];

    for (const booking of bookings) {
      try {
        const response = await fetch("/api/admin/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });

        const data = await response.json();
        newResults.push({
          bookingId: booking.id,
          success: data.success,
          engineerName: data.engineerName,
          error: data.error,
          score: data.score,
        });
        setResults([...newResults]);
      } catch {
        newResults.push({
          bookingId: booking.id,
          success: false,
          error: "Request failed",
        });
        setResults([...newResults]);
      }
    }

    setAllocatingAll(false);
    setShowResultsDialog(true);

    const successCount = newResults.filter((r) => r.success).length;
    if (successCount > 0) {
      toast.success(`Successfully allocated ${successCount} of ${bookings.length} bookings`);
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error("No bookings could be allocated");
    }
  };

  return (
    <>
      <Button
        onClick={allocateAll}
        disabled={allocatingAll || bookings.length === 0}
      >
        {allocatingAll ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Allocating {results.length}/{bookings.length}...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Auto-Allocate All
          </>
        )}
      </Button>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocation Results</DialogTitle>
            <DialogDescription>
              {results.filter((r) => r.success).length} of {results.length}{" "}
              bookings allocated successfully
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {results.map((result) => {
              const booking = bookings.find((b) => b.id === result.bookingId);
              return (
                <div
                  key={result.bookingId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">
                      {booking?.reference}
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking?.service.name}
                    </div>
                  </div>
                  <div className="text-right">
                    {result.success ? (
                      <div className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">{result.engineerName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-700">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">{result.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BookingsTableClient({
  bookings,
}: {
  bookings: Booking[];
}) {
  const router = useRouter();
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const allocateSingle = async (bookingId: string) => {
    setAllocatingId(bookingId);
    try {
      const response = await fetch("/api/admin/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Allocated to ${data.engineerName}`);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || "Allocation failed");
      }
    } catch {
      toast.error("Failed to allocate booking");
    } finally {
      setAllocatingId(null);
    }
  };

  return (
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
                  <div>
                    {format(new Date(booking.scheduledDate), "EEE, MMM d")}
                  </div>
                  <div className="text-sm text-gray-500">{booking.slot}</div>
                </div>
              ) : (
                <span className="text-gray-400">Not set</span>
              )}
            </TableCell>
            <TableCell>{formatCurrency(booking.quotedPrice)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => allocateSingle(booking.id)}
                  disabled={allocatingId === booking.id}
                >
                  {allocatingId === booking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-1" />
                      Allocate
                    </>
                  )}
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
  );
}
