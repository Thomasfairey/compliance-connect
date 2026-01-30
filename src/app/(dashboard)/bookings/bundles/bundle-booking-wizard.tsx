"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BundleSelector } from "@/components/booking/bundle-selector";
import { PricingCalendar } from "@/components/booking/pricing-calendar";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import {
  calculateBundlePrice,
  purchaseBundle,
  type BundleWithServices,
  type BundlePriceQuote,
} from "@/lib/actions/bundles";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Loader2,
  Package,
} from "lucide-react";

type BundleBookingWizardProps = {
  sites: Array<{
    id: string;
    name: string;
    postcode: string;
    hasProfile: boolean;
  }>;
  allBundles: BundleWithServices[];
  recommendedBundles: BundleWithServices[];
  initialSiteId?: string;
};

export function BundleBookingWizard({
  sites,
  allBundles,
  recommendedBundles,
  initialSiteId,
}: BundleBookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId || "");
  const [selectedBundle, setSelectedBundle] = useState<BundleWithServices | null>(
    null
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<BundlePriceQuote | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const handleSelectBundle = async (bundle: BundleWithServices) => {
    setSelectedBundle(bundle);

    // Initialize default quantities
    const defaultQty: Record<string, number> = {};
    bundle.items.forEach((item) => {
      defaultQty[item.service.id] = item.includedQty || 10;
    });
    setQuantities(defaultQty);

    // Calculate initial quote
    if (selectedSiteId) {
      const initialQuote = await calculateBundlePrice(
        bundle.id,
        selectedSiteId,
        defaultQty
      );
      setQuote(initialQuote);
    }

    setStep(2);
  };

  const handleQuantityChange = async (serviceId: string, value: number) => {
    const newQuantities = { ...quantities, [serviceId]: value };
    setQuantities(newQuantities);

    if (selectedBundle && selectedSiteId) {
      const newQuote = await calculateBundlePrice(
        selectedBundle.id,
        selectedSiteId,
        newQuantities
      );
      setQuote(newQuote);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!selectedBundle || !selectedSiteId || !selectedDate || !selectedSlot) {
      toast.error("Please complete all steps");
      return;
    }

    setIsLoading(true);

    try {
      const result = await purchaseBundle(
        selectedBundle.id,
        selectedSiteId,
        quantities,
        selectedDate,
        selectedSlot
      );

      if (result.success) {
        toast.success("Bundle booked successfully!");
        router.push("/bookings");
      } else {
        toast.error(result.error || "Failed to book bundle");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[
          { num: 1, label: "Select Bundle", icon: Package },
          { num: 2, label: "Quantities", icon: Building2 },
          { num: 3, label: "Schedule", icon: Calendar },
          { num: 4, label: "Confirm", icon: Check },
        ].map((s, index) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.num
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            {index < 3 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 ${
                  step > s.num ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Site Selector */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Site</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name} ({site.postcode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Bundle Selection */}
      {step === 1 && selectedSiteId && (
        <BundleSelector
          bundles={allBundles}
          recommendedBundles={recommendedBundles}
          onSelectBundle={handleSelectBundle}
          onSkip={() => router.push("/bookings/new")}
        />
      )}

      {/* Step 2: Quantities */}
      {step === 2 && selectedBundle && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customize Quantities</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {selectedBundle.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.service.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.service.basePrice)} per{" "}
                      {item.service.unitName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Input
                        type="number"
                        min={1}
                        value={quantities[item.service.id] || 1}
                        onChange={(e) =>
                          handleQuantityChange(
                            item.service.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-16">
                      {item.service.unitName}s
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {quote && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="line-through text-gray-400">
                    {formatPrice(quote.originalTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Bundle Discount ({quote.discountPercent}%)</span>
                  <span>-{formatPrice(quote.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(quote.finalTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(3)}>
                Continue to Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Date Selection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Select Date</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PricingCalendar
              siteId={selectedSiteId}
              serviceId={selectedBundle?.items[0]?.service.id || ""}
              selected={selectedDate || undefined}
              onSelect={(date) => {
                if (date) {
                  handleDateSelect(date);
                }
              }}
              estimatedQty={
                quantities[selectedBundle?.items[0]?.service.id || ""] || 10
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Time Slot and Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Select Time & Confirm</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base">Time Slot</Label>
              <TimeSlotPicker
                selected={selectedSlot as any}
                onSelect={(slot) => setSelectedSlot(slot)}
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">Booking Summary</h4>
              <div className="text-sm space-y-1 text-blue-800">
                <p>
                  <strong>Bundle:</strong> {selectedBundle?.name}
                </p>
                <p>
                  <strong>Site:</strong>{" "}
                  {sites.find((s) => s.id === selectedSiteId)?.name}
                </p>
                <p>
                  <strong>Date:</strong> {selectedDate?.toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {selectedSlot}
                </p>
                <p className="pt-2 text-lg font-semibold">
                  Total: {formatPrice(quote?.finalTotal || 0)}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !selectedSlot}
                size="lg"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
