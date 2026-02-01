"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, startOfDay } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  User,
  MapPin,
  Briefcase,
  Wrench,
  Clock,
  PoundSterling,
  Save,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Service, User as UserType, EngineerProfile, EngineerCompetency, EngineerCoverageArea, Site } from "@prisma/client";

interface CustomerWithSites extends UserType {
  sites: Pick<Site, "id" | "name" | "postcode" | "address">[];
}

interface EngineerWithProfile extends UserType {
  engineerProfile: (EngineerProfile & {
    competencies: EngineerCompetency[];
    coverageAreas: EngineerCoverageArea[];
  }) | null;
}

interface NewBookingFormProps {
  customers: CustomerWithSites[];
  services: Service[];
  engineers: EngineerWithProfile[];
}

export function NewBookingForm({ customers, services, engineers }: NewBookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [slot, setSlot] = useState<"AM" | "PM">("AM");
  const [quantity, setQuantity] = useState(1);
  const [engineerId, setEngineerId] = useState("");
  const [notes, setNotes] = useState("");

  // Derived values
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedSite = selectedCustomer?.sites.find((s) => s.id === siteId);
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedEngineer = engineers.find((e) => e.id === engineerId);

  // Calculate price
  const basePrice = selectedService?.basePrice || 0;
  const minCharge = selectedService?.minCharge || 0;
  const calculatedPrice = Math.max(basePrice * quantity, minCharge);

  // Filter engineers based on service competency and site coverage
  const eligibleEngineers = engineers.filter((engineer) => {
    if (!engineer.engineerProfile) return false;

    // Check competency
    if (serviceId) {
      const hasCompetency = engineer.engineerProfile.competencies.some(
        (c) => c.serviceId === serviceId
      );
      if (!hasCompetency) return false;
    }

    // Check coverage area
    if (selectedSite?.postcode) {
      const postcodePrefix = selectedSite.postcode.split(" ")[0].toUpperCase();
      const hasCoverage = engineer.engineerProfile.coverageAreas.some(
        (area) => postcodePrefix.startsWith(area.postcodePrefix)
      );
      if (!hasCoverage) return false;
    }

    return true;
  });

  const canProceedStep1 = customerId && siteId;
  const canProceedStep2 = serviceId && quantity > 0;
  const canProceedStep3 = scheduledDate && slot;
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          siteId,
          serviceId,
          scheduledDate: scheduledDate!.toISOString(),
          slot,
          estimatedQty: quantity,
          quotedPrice: calculatedPrice,
          engineerId: engineerId || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create booking");
      }

      const booking = await response.json();
      toast.success("Booking created successfully");
      router.push(`/admin/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <Link href="/admin/bookings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Bookings
      </Link>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                step >= s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > s ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Customer & Site */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer & Site
            </CardTitle>
            <CardDescription>Select the customer and site for this booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSiteId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <span>{customer.name}</span>
                        <span className="text-gray-500 text-sm">
                          ({customer.sites.length} site{customer.sites.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div>
                <Label>Site</Label>
                {selectedCustomer.sites.length > 0 ? (
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer.sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{site.name}</span>
                            <span className="text-gray-500 text-sm">{site.postcode}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    This customer has no sites. Add a site first.
                  </div>
                )}
              </div>
            )}

            {selectedSite && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedSite.name}</div>
                <div className="text-sm text-gray-500">{selectedSite.address}</div>
                <div className="text-sm text-gray-500">{selectedSite.postcode}</div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Service */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Service
            </CardTitle>
            <CardDescription>Choose the service and quantity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Service Type</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{service.name}</span>
                        <span className="text-gray-500 text-sm">
                          £{service.basePrice.toFixed(2)}/{service.unitName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService && (
              <>
                <div>
                  <Label>Estimated Quantity ({selectedService.unitName}s)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800">Quoted Price</span>
                    <span className="text-2xl font-bold text-blue-600">
                      £{calculatedPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {quantity} x £{basePrice.toFixed(2)} = £{(quantity * basePrice).toFixed(2)}
                    {minCharge > quantity * basePrice && ` (min charge: £${minCharge.toFixed(2)})`}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule
            </CardTitle>
            <CardDescription>Select the date and time slot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < startOfDay(new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Time Slot</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant={slot === "AM" ? "default" : "outline"}
                  onClick={() => setSlot("AM")}
                  className="h-16"
                >
                  <div className="text-center">
                    <div className="font-medium">Morning</div>
                    <div className="text-xs opacity-80">8:00 - 12:00</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={slot === "PM" ? "default" : "outline"}
                  onClick={() => setSlot("PM")}
                  className="h-16"
                >
                  <div className="text-center">
                    <div className="font-medium">Afternoon</div>
                    <div className="text-xs opacity-80">12:00 - 17:00</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!canProceedStep3}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Engineer & Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Engineer & Review
            </CardTitle>
            <CardDescription>Optionally assign an engineer and review the booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assign Engineer (Optional)</Label>
              <Select value={engineerId} onValueChange={setEngineerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave unassigned for auto-allocation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-gray-500">Auto-allocate later</span>
                  </SelectItem>
                  {eligibleEngineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      {engineer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleEngineers.length === 0 && serviceId && selectedSite && (
                <p className="text-sm text-amber-600 mt-1">
                  No engineers are qualified for this service in this area
                </p>
              )}
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or access details..."
                rows={3}
              />
            </div>

            {/* Booking Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3 mt-4">
              <h4 className="font-medium">Booking Summary</h4>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Customer</div>
                <div className="font-medium">{selectedCustomer?.name}</div>

                <div className="text-gray-500">Site</div>
                <div className="font-medium">{selectedSite?.name} ({selectedSite?.postcode})</div>

                <div className="text-gray-500">Service</div>
                <div className="font-medium">{selectedService?.name}</div>

                <div className="text-gray-500">Quantity</div>
                <div className="font-medium">{quantity} {selectedService?.unitName}s</div>

                <div className="text-gray-500">Date</div>
                <div className="font-medium">
                  {scheduledDate ? format(scheduledDate, "PPP") : "-"}
                </div>

                <div className="text-gray-500">Time</div>
                <div className="font-medium">{slot === "AM" ? "Morning (8-12)" : "Afternoon (12-17)"}</div>

                <div className="text-gray-500">Engineer</div>
                <div className="font-medium">
                  {selectedEngineer?.name || <Badge variant="outline">Auto-allocate</Badge>}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between">
                <span className="font-medium">Total Price</span>
                <span className="text-xl font-bold text-blue-600">
                  £{calculatedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
