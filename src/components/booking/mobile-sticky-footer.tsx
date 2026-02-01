"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileStickyFooterProps = {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canProceed: boolean;
  loading?: boolean;
  isLastStep?: boolean;
};

export function MobileStickyFooter({
  currentStep,
  totalSteps,
  stepTitle,
  onBack,
  onNext,
  onSubmit,
  canProceed,
  loading = false,
  isLastStep = false,
}: MobileStickyFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-lg safe-area-pb">
      {/* Progress indicator */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">{stepTitle}</span>
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="px-4 pb-4 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentStep === 0 || loading}
          className={cn(
            "h-12 flex-shrink-0",
            currentStep === 0 && "invisible"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {isLastStep ? (
          <Button
            onClick={onSubmit}
            disabled={loading || !canProceed}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Confirm Booking"
            )}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={!canProceed || loading}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
