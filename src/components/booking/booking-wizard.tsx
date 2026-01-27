"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Zap,
  Shield,
  FileCheck,
  Building2,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatPrice, calculateQuote } from "@/lib/utils";
import { createBooking, createSite } from "@/lib/actions";
import type { Service, Site } from "@prisma/client";
import type { BookingStep, BookingWizardData } from "@/types";

interface BookingWizardProps {
  services: Service[];
  sites: Site[];
  initialSiteId?: string;
}

const serviceIcons: Record<string, typeof Zap> = {
  "pat-testing": Zap,
  "fire-alarm-testing": Shield,
  "emergency-lighting": FileCheck,
  "fixed-wire-testing": Building2,
};

const steps: { id: BookingStep; title: string; description: string }[] = [
  { id: "service", title: "Select Service", description: "Choose your test type" },
  { id: "site", title: "Select Site", description: "Where is the test needed?" },
  { id: "details", title: "Test Details", description: "How many items?" },
  { id: "schedule", title: "Schedule", description: "Pick a date and time" },
  { id: "review", title: "Review", description: "Confirm your booking" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function BookingWizard({ services, sites: initialSites, initialSiteId }: BookingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<BookingWizardData>(() => {
    // Pre-select site if initialSiteId is provided and valid
    if (initialSiteId && initialSites.some(s => s.id === initialSiteId)) {
      return { siteId: initialSiteId };
    }
    return {};
  });
  const [sites, setSites] = useState(initialSites);
  const [loading, setLoading] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSite, setNewSite] = useState({
    name: "",
    address: "",
    postcode: "",
    accessNotes: "",
  });

  const selectedService = services.find((s) => s.id === data.serviceId);
  const selectedSite = sites.find((s) => s.id === data.siteId);

  const quotedPrice = selectedService && data.estimatedQty
    ? calculateQuote(selectedService.basePrice, selectedService.minCharge, data.estimatedQty)
    : 0;

  const canProceed = useCallback(() => {
    switch (steps[currentStep].id) {
      case "service":
        return !!data.serviceId;
      case "site":
        return !!data.siteId;
      case "details":
        return data.estimatedQty && data.estimatedQty > 0;
      case "schedule":
        return !!data.scheduledDate && !!data.slot;
      case "review":
        return true;
      default:
        return false;
    }
  }, [currentStep, data]);

  const goNext = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!data.serviceId || !data.siteId || !data.estimatedQty || !data.scheduledDate || !data.slot) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);
    try {
      const result = await createBooking({
        serviceId: data.serviceId,
        siteId: data.siteId,
        estimatedQty: data.estimatedQty,
        scheduledDate: data.scheduledDate,
        slot: data.slot,
        notes: data.notes,
      });

      if (result.success && result.data) {
        toast.success("Booking created successfully!");
        router.push(`/bookings/${result.data.id}`);
      } else {
        toast.error(result.error || "Failed to create booking");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async () => {
    if (!newSite.name || !newSite.address || !newSite.postcode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const result = await createSite(newSite);
      if (result.success && result.data) {
        setSites([...sites, result.data]);
        setData({ ...data, siteId: result.data.id });
        setShowNewSite(false);
        setNewSite({ name: "", address: "", postcode: "", accessNotes: "" });
        toast.success("Site created successfully!");
      } else {
        toast.error(result.error || "Failed to create site");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                  index < currentStep
                    ? "bg-green-500 text-white"
                    : index === currentStep
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block w-12 lg:w-24 h-0.5 mx-2",
                    index < currentStep ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStep].title}
          </h2>
          <p className="text-sm text-gray-500">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Step 1: Select Service */}
            {steps[currentStep].id === "service" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {services.map((service) => {
                  const Icon = serviceIcons[service.slug] || Zap;
                  const isSelected = data.serviceId === service.id;

                  return (
                    <Card
                      key={service.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected
                          ? "border-2 border-black ring-1 ring-black"
                          : "border-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => setData({ ...data, serviceId: service.id })}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Icon className="h-6 w-6 text-gray-900" />
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                          {service.description}
                        </p>
                        <p className="text-sm font-medium">
                          From {formatPrice(service.minCharge)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Step 2: Select Site */}
            {steps[currentStep].id === "site" && (
              <div>
                {showNewSite ? (
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900">Add New Site</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Site Name *</Label>
                          <Input
                            id="name"
                            placeholder="e.g., London HQ"
                            value={newSite.name}
                            onChange={(e) =>
                              setNewSite({ ...newSite, name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address *</Label>
                          <Input
                            id="address"
                            placeholder="e.g., 123 Main Street, London"
                            value={newSite.address}
                            onChange={(e) =>
                              setNewSite({ ...newSite, address: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="postcode">Postcode *</Label>
                          <Input
                            id="postcode"
                            placeholder="e.g., SW1A 1AA"
                            value={newSite.postcode}
                            onChange={(e) =>
                              setNewSite({ ...newSite, postcode: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="accessNotes">Access Notes</Label>
                          <Textarea
                            id="accessNotes"
                            placeholder="e.g., Ring bell at reception"
                            value={newSite.accessNotes}
                            onChange={(e) =>
                              setNewSite({ ...newSite, accessNotes: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowNewSite(false)}
                            disabled={loading}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateSite}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add Site
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {sites.map((site) => {
                      const isSelected = data.siteId === site.id;

                      return (
                        <Card
                          key={site.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            isSelected
                              ? "border-2 border-black ring-1 ring-black"
                              : "border-gray-100 hover:border-gray-200"
                          )}
                          onClick={() => setData({ ...data, siteId: site.id })}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <MapPin className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {site.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {site.address}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {site.postcode}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    <Button
                      variant="outline"
                      className="w-full h-16 border-dashed"
                      onClick={() => setShowNewSite(true)}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add New Site
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Details */}
            {steps[currentStep].id === "details" && selectedService && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <Label htmlFor="quantity">
                      Estimated Number of {selectedService.unitName}s *
                    </Label>
                    <p className="text-sm text-gray-500 mb-2">
                      How many items need testing?
                    </p>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="e.g., 50"
                      value={data.estimatedQty || ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          estimatedQty: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Any special requirements or instructions?
                    </p>
                    <Textarea
                      id="notes"
                      placeholder="e.g., Please test all kitchen appliances first"
                      value={data.notes || ""}
                      onChange={(e) => setData({ ...data, notes: e.target.value })}
                    />
                  </div>

                  {data.estimatedQty && data.estimatedQty > 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Estimated Quote</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(quotedPrice)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Based on {data.estimatedQty} {selectedService.unitName}s @{" "}
                        {formatPrice(selectedService.basePrice)}/{selectedService.unitName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Schedule */}
            {steps[currentStep].id === "schedule" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <Label className="mb-4 block">Select Date *</Label>
                    <div className="flex justify-center">
                      <CalendarComponent
                        mode="single"
                        selected={data.scheduledDate}
                        onSelect={(date) =>
                          setData({ ...data, scheduledDate: date })
                        }
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Label className="mb-4 block">Select Time Slot *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          data.slot === "AM"
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setData({ ...data, slot: "AM" })}
                      >
                        <Clock className="h-5 w-5 mb-2" />
                        <p className="font-semibold">Morning</p>
                        <p className="text-sm opacity-75">8:00 AM - 12:00 PM</p>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          data.slot === "PM"
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setData({ ...data, slot: "PM" })}
                      >
                        <Clock className="h-5 w-5 mb-2" />
                        <p className="font-semibold">Afternoon</p>
                        <p className="text-sm opacity-75">1:00 PM - 5:00 PM</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Review */}
            {steps[currentStep].id === "review" && selectedService && selectedSite && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <Package className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Service</p>
                        <p className="font-medium">{selectedService.name}</p>
                        <p className="text-sm text-gray-500">
                          {data.estimatedQty} {selectedService.unitName}s
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{selectedSite.name}</p>
                        <p className="text-sm text-gray-500">
                          {selectedSite.address}, {selectedSite.postcode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Schedule</p>
                        <p className="font-medium">
                          {data.scheduledDate
                            ? format(data.scheduledDate, "EEEE, d MMMM yyyy")
                            : ""}
                        </p>
                        <p className="text-sm text-gray-500">
                          {data.slot === "AM"
                            ? "Morning (8:00 AM - 12:00 PM)"
                            : "Afternoon (1:00 PM - 5:00 PM)"}
                        </p>
                      </div>
                    </div>

                    {data.notes && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                        <p className="text-gray-700">{data.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500">Quoted Price</span>
                      <span className="text-2xl font-bold">
                        {formatPrice(quotedPrice)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Final price may vary based on actual items tested
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0 || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button onClick={handleSubmit} disabled={loading || !canProceed()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Booking
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            Continue
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
