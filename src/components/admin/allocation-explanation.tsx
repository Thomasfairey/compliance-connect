"use client";

import { useState, useEffect } from "react";
import { getBookingAllocationExplanation } from "@/lib/actions/allocation";
import { Loader2, User, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllocationExplanationProps {
  bookingId: string;
}

type Explanation = Awaited<ReturnType<typeof getBookingAllocationExplanation>>;

export function AllocationExplanation({ bookingId }: AllocationExplanationProps) {
  const [data, setData] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBookingAllocationExplanation(bookingId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading allocation data...
      </div>
    );
  }

  if (!data || data.scoredCandidates.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2">
        No allocation scoring data available for this booking.
      </div>
    );
  }

  const selected = data.scoredCandidates.find((c) => c.wasSelected);
  const alternatives = data.scoredCandidates.filter((c) => !c.wasSelected);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full text-left"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Why this engineer?
      </button>

      {expanded && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
          {/* Selected Engineer Scores */}
          {selected && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
                Selected: {selected.engineerName}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ScoreBar label="Customer" score={selected.customerScore} color="text-emerald-600" />
                <ScoreBar label="Engineer" score={selected.engineerScore} color="text-blue-600" />
                <ScoreBar label="Platform" score={selected.platformScore} color="text-purple-600" />
              </div>
              <div className="mt-2 text-xs text-blue-700 font-medium">
                Composite: {selected.compositeScore.toFixed(1)} / 100
              </div>

              {/* Top factors */}
              {selected.factors && selected.factors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selected.factors
                    .sort((a, b) => b.contribution - a.contribution)
                    .slice(0, 4)
                    .map((factor) => (
                      <div key={factor.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{factor.name}</span>
                        <span className="font-medium">{Math.round(factor.normalizedScore)}/100</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative Candidates */}
          {alternatives.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Alternatives
              </div>
              <div className="space-y-1.5">
                {alternatives.map((candidate) => (
                  <div
                    key={candidate.engineerId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{candidate.engineerName}</span>
                    </div>
                    <span className="text-gray-500">
                      Score: {candidate.compositeScore.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={cn("font-medium", color)}>{Math.round(score)}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", {
            "bg-emerald-500": color === "text-emerald-600",
            "bg-blue-500": color === "text-blue-600",
            "bg-purple-500": color === "text-purple-600",
          })}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
