"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package, Sparkles, ArrowRight } from "lucide-react";

type BundlePromoCardProps = {
  maxDiscount?: number;
  bundleCount?: number;
};

export function BundlePromoCard({
  maxDiscount = 25,
  bundleCount = 7,
}: BundlePromoCardProps) {
  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Save up to {maxDiscount}%
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Bundle & Save on Compliance Testing
            </h2>
            <p className="text-blue-100 text-sm sm:text-base max-w-lg">
              Combine multiple services like PAT testing, fire alarms, and emergency
              lighting into one discounted package. {bundleCount} pre-configured bundles
              available.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Link href="/bookings/bundles">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg"
              >
                View Bundles
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
