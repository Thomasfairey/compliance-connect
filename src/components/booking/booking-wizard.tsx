"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Package,
  Sparkles,
  Timer,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PricingCalendar } from "@/components/booking/pricing-calendar";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { MobileStickyFooter } from "@/components/booking/mobile-sticky-footer";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn, formatPrice, calculateQuote } from "@/lib/utils";
import { createBooking, createSite, getAvailableDiscount } from "@/lib/actions";
import type { Service, Site } from "@prisma/client";
import type { BookingStep, BookingWizardData, TimeSlot } from "@/types";

interface BookingWizardProps {
  services: Service[];
  sites: Site[];
  initialSiteId?: string;
  initialServiceId?: string;
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

type PricingInfo = {
  originalPrice: number;
  discountPercent: number;
  discountedPrice: number;
  discountReason?: string;
} | null;

export function BookingWizard({ services, sites: initialSites, initialSiteId, initialServiceId }: BookingWizardProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Calculate initial step based on pre-filled data
  const getInitialStep = () => {
    const hasService = initialServiceId && services.some(s => s.id === initialServiceId);
    const hasSite = initialSiteId && initialSites.some(s => s.id === initialSiteId);

    if (hasService && hasSite) {
      return 2; // Skip to details step
    } else if (hasService) {
      return 1; // Skip to site selection
    }
    return 0;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<BookingWizardData>(() => {
    const initialData: BookingWizardData = {};

    if (initialServiceId && services.some(s => s.id === initialServiceId)) {
      initialData.serviceId = initialServiceId;
    }
    if (initialSiteId && initialSites.some(s => s.id === initialSiteId)) {
      initialData.siteId = initialSiteId;
    }

    return initialData;
  });
  const [sites, setSites] = useState(initialSites);
  const [loading, setLoading] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const isSubmittingRef = useRef(false);
  const [newSite, setNewSite] = useState({
    name: "",
    address: "",
    postcode: "",
    accessNotes: "",
  });

  // Dynamic pricing state
  const [pricingInfo, setPricingInfo] = useState<PricingInfo>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === data.serviceId);
  const selectedSite = sites.find((s) => s.id === data.siteId);

  const quotedPrice = selectedService && data.estimatedQty
    ? calculateQuote(selectedService.basePrice, selectedService.minCharge, data.estimatedQty)
    : 0;

  // Calculate estimated duration
  const estimatedDuration = selectedService && data.estimatedQty
    ? Math.ceil(selectedService.baseMinutes + selectedService.minutesPerUnit * data.estimatedQty)
    : 0;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatSlotTime = (slot: TimeSlot) => {
    const [hours] = slot.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:00 ${period}`;
  };

  // Fetch dynamic pricing when schedule is selected
  useEffect(() => {
    const fetchPricing = async () => {
      if (data.serviceId && data.siteId && data.scheduledDate && data.estimatedQty) {
        setLoadingPricing(true);
        try {
          const pricing = await getAvailableDiscount(
            data.serviceId,
            data.siteId,
            data.scheduledDate,
            data.estimatedQty
          );
          setPricingInfo(pricing);
        } catch (error) {
          console.error("Failed to fetch pricing:", error);
          setPricingInfo(null);
        }
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, [data.serviceId, data.siteId, data.scheduledDate, data.estimatedQty]);

  const canProceed = useCallback((): boolean => {
    switch (steps[currentStep].id) {
      case "service":
        return !!data.serviceId;
      case "site":
        return !!data.siteId;
      case "details":
        return (data.estimatedQty ?? 0) > 0;
      case "schedule":
        return !!data.scheduledDate && !!data.slot;
      case "review":
        return true;
      default:
        return false;
    }
  }, [currentStep, data]);

  // Clear validation error when user makes a valid selection
  useEffect(() => {
    if (validationError && canProceed()) {
      setValidationError(null);
    }
  }, [data, validationError, canProceed]);

  const getValidationMessage = (): string => {
    switch (steps[currentStep].id) {
      case "service":
        return "Please select a service to continue";
      case "site":
        return "Please select a site to continue";
      case "details":
        return "Please enter the number of items to test";
      case "schedule":
        if (!data.scheduledDate) return "Please select a date";
        if (!data.slot) return "Please select a time slot";
        return "Please complete the schedule";
      default:
        return "Please complete this step";
    }
  };

  const goNext = () => {
    if (canProceed()) {
      if (currentStep < steps.length - 1) {
        setValidationError(null);
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
    } else {
      const message = getValidationMessage();
      setValidationError(message);
      toast.error(message);
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

    if (isSubmittingRef.current || loading) {
      return;
    }
    isSubmittingRef.current = true;
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
        isSubmittingRef.current = false;
      }
    } catch {
      toast.error("An error occurred");
      isSubmittingRef.current = false;
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

  const finalPrice = pricingInfo?.discountedPrice ?? quotedPrice;
  const hasDiscount = pricingInfo && pricingInfo.discountPercent > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress - Desktop only shows full stepper, mobile shows simplified header */}
      <div className="mb-8">
        {/* Desktop progress stepper */}
        <div className="hidden lg:flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                  index < currentStep
                    ? "gradient-primary text-white"
                    : index === currentStep
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
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
                    "w-12 lg:w-24 h-0.5 mx-2 transition-all",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl lg:text-xl font-semibold text-foreground">
            {steps[currentStep].title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
          {validationError && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
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
                        "cursor-pointer transition-all hover:shadow-lg",
                        isSelected
                          ? "border-2 border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setData({ ...data, serviceId: service.id })}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            isSelected ? "gradient-primary" : "bg-muted"
                          )}>
                            <Icon className={cn("h-6 w-6", isSelected ? "text-white" : "text-foreground")} />
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {service.description}
                        </p>
                        <p className="text-sm font-medium text-primary">
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
                      <h3 className="font-semibold text-foreground">Add New Site</h3>
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
                            className="h-12"
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
                            className="h-12"
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
                            className="h-12"
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
                            className="flex-1 h-12"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateSite}
                            disabled={loading}
                            className="flex-1 h-12 gradient-primary text-white"
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
                            "cursor-pointer transition-all hover:shadow-lg",
                            isSelected
                              ? "border-2 border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => setData({ ...data, siteId: site.id })}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                  isSelected ? "gradient-primary" : "bg-muted"
                                )}>
                                  <MapPin className={cn("h-5 w-5", isSelected ? "text-white" : "text-muted-foreground")} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">
                                    {site.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {site.address}
                                  </p>
                                  <p className="text-sm text-muted-foreground/70">
                                    {site.postcode}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center">
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
                      className="w-full h-16 border-dashed border-2 hover:border-primary hover:bg-primary/5"
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
                    <p className="text-sm text-muted-foreground mb-2">
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
                      className="h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <p className="text-sm text-muted-foreground mb-2">
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
                    <div className="space-y-3">
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Estimated Quote</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatPrice(quotedPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on {data.estimatedQty} {selectedService.unitName}s @{" "}
                          {formatPrice(selectedService.basePrice)}/{selectedService.unitName}
                        </p>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="w-4 h-4 text-primary" />
                          <p className="text-sm font-medium text-primary">Estimated Duration</p>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {formatDuration(estimatedDuration)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on {selectedService.baseMinutes}min base + {selectedService.minutesPerUnit}min per {selectedService.unitName}
                        </p>
                      </div>
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Days highlighted in green have discounts available based on existing bookings nearby.
                    </p>
                    <PricingCalendar
                      selected={data.scheduledDate}
                      onSelect={(date) => setData({ ...data, scheduledDate: date })}
                      serviceId={data.serviceId}
                      siteId={data.siteId}
                      estimatedQty={data.estimatedQty}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Label className="mb-4 block">Select Start Time *</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose when you would like the engineer to arrive.
                    </p>
                    <TimeSlotPicker
                      selected={data.slot}
                      onSelect={(slot) => setData({ ...data, slot })}
                      estimatedDuration={estimatedDuration}
                    />
                  </CardContent>
                </Card>

                {/* Dynamic Pricing Display */}
                {data.scheduledDate && data.slot && (
                  <Card className={hasDiscount ? "border-green-200 bg-green-50" : ""}>
                    <CardContent className="p-6">
                      {loadingPricing ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Checking for discounts...</span>
                        </div>
                      ) : hasDiscount ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-800">
                              {pricingInfo.discountPercent}% Discount Applied!
                            </span>
                          </div>
                          <p className="text-sm text-green-700">{pricingInfo.discountReason}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-lg text-muted-foreground line-through">
                              {formatPrice(pricingInfo.originalPrice)}
                            </span>
                            <span className="text-2xl font-bold text-green-700">
                              {formatPrice(pricingInfo.discountedPrice)}
                            </span>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Save {formatPrice(pricingInfo.originalPrice - pricingInfo.discountedPrice)}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Quote for this date</span>
                          <span className="text-xl font-bold">{formatPrice(quotedPrice)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {steps[currentStep].id === "review" && selectedService && selectedSite && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                      <Package className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Service</p>
                        <p className="font-medium">{selectedService.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.estimatedQty} {selectedService.unitName}s
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{selectedSite.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSite.address}, {selectedSite.postcode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Schedule</p>
                        <p className="font-medium">
                          {data.scheduledDate
                            ? format(data.scheduledDate, "EEEE, d MMMM yyyy")
                            : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Starting at {data.slot ? formatSlotTime(data.slot) : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <Timer className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Duration</p>
                        <p className="font-medium">{formatDuration(estimatedDuration)}</p>
                      </div>
                    </div>

                    {data.notes && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Notes</p>
                        <p className="text-foreground">{data.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    {hasDiscount ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Original Price</span>
                          <span className="line-through">{formatPrice(pricingInfo.originalPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-green-600">
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            {pricingInfo.discountPercent}% Discount
                          </span>
                          <span>-{formatPrice(pricingInfo.originalPrice - pricingInfo.discountedPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="font-medium">Final Price</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatPrice(finalPrice)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Quoted Price</span>
                        <span className="text-2xl font-bold">
                          {formatPrice(quotedPrice)}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Final price may vary based on actual items tested
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0 || loading}
          className="h-12 px-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="h-12 px-8 gradient-primary text-white"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Booking
          </Button>
        ) : (
          <Button
            onClick={goNext}
            className={cn(
              "h-12 px-8 text-white",
              canProceed() ? "gradient-primary" : "bg-gray-400 hover:bg-gray-500"
            )}
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Mobile Sticky Footer */}
      {isMobile && (
        <MobileStickyFooter
          currentStep={currentStep}
          totalSteps={steps.length}
          stepTitle={steps[currentStep].title}
          onBack={goBack}
          onNext={goNext}
          onSubmit={handleSubmit}
          canProceed={canProceed()}
          loading={loading}
          isLastStep={currentStep === steps.length - 1}
        />
      )}

      {/* Add bottom padding on mobile for sticky footer */}
      {isMobile && <div className="h-32" />}
    </div>
  );
}
