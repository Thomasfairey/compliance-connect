"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProvisionalBadgeProps = {
  provisionalUntil?: Date | null;
  size?: "sm" | "default";
};

export function ProvisionalBadge({
  provisionalUntil,
  size = "default",
}: ProvisionalBadgeProps) {
  const getDaysRemaining = () => {
    if (!provisionalUntil) return null;
    const now = new Date();
    const deadline = new Date(provisionalUntil);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  const getLabel = () => {
    if (daysRemaining === null) return "Tentative";
    if (daysRemaining <= 0) return "Confirming...";
    if (daysRemaining === 1) return "Confirms tomorrow";
    return `Confirms in ${daysRemaining} days`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`
              bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100
              ${size === "sm" ? "text-xs px-2 py-0.5" : ""}
            `}
          >
            <Clock className={`mr-1 ${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            {getLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            This booking is tentative and may be rescheduled.
            {daysRemaining !== null && daysRemaining > 0 && (
              <>
                <br />
                It will be confirmed on{" "}
                {new Date(provisionalUntil!).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
                .
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
