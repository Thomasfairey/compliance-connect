"use client";

import { useRouter } from "next/navigation";
import { Package, ClipboardList, Sparkles, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared";

type BookingTypeSelectorProps = {
  siteId?: string;
  maxBundleDiscount?: number;
};

export function BookingTypeSelector({
  siteId,
  maxBundleDiscount = 25,
}: BookingTypeSelectorProps) {
  const router = useRouter();

  const handleSelectIndividual = () => {
    const params = new URLSearchParams();
    params.set("bookingType", "individual");
    if (siteId) params.set("siteId", siteId);
    router.push(`/bookings/new?${params.toString()}`);
  };

  const handleSelectBundle = () => {
    const params = new URLSearchParams();
    if (siteId) params.set("siteId", siteId);
    router.push(`/bookings/bundles?${params.toString()}`);
  };

  return (
    <div>
      <PageHeader
        title="Book a Test"
        description="Choose how you'd like to book your compliance testing."
        backHref="/dashboard"
      />

      <div className="max-w-3xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Individual Service Card */}
          <button
            onClick={handleSelectIndividual}
            className="group text-left p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all bg-white"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gray-900 transition-colors">
              <ClipboardList className="h-7 w-7 text-gray-600 group-hover:text-white transition-colors" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Individual Service
            </h2>
            <p className="text-gray-500 mb-6">
              Book a single compliance test like PAT testing, fire alarm testing,
              or emergency lighting checks.
            </p>

            <div className="flex items-center text-gray-900 font-medium group-hover:text-blue-600 transition-colors">
              Select Service
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Bundle Card */}
          <button
            onClick={handleSelectBundle}
            className="group text-left p-6 sm:p-8 rounded-2xl border-2 border-blue-200 hover:border-blue-600 hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden"
          >
            {/* Discount Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-full text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Save up to {maxBundleDiscount}%
            </div>

            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <Package className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Bundle & Save
            </h2>
            <p className="text-gray-500 mb-6">
              Combine multiple tests into one discounted package. Perfect for
              annual compliance requirements.
            </p>

            <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
              View Bundles
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Not sure what you need?{" "}
          <button
            onClick={handleSelectBundle}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View our bundles
          </button>{" "}
          for pre-configured compliance packages.
        </p>
      </div>
    </div>
  );
}
