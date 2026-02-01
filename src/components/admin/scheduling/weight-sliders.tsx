"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ScoringWeights } from "@/lib/scheduling/v2/types";

interface WeightSlidersProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
  disabled?: boolean;
}

const presets = [
  {
    name: "Customer First",
    weights: { customer: 0.5, engineer: 0.25, platform: 0.25 },
    description: "Prioritize customer experience and satisfaction",
  },
  {
    name: "Balanced",
    weights: { customer: 0.4, engineer: 0.3, platform: 0.3 },
    description: "Equal consideration for all parties",
  },
  {
    name: "Efficiency Focus",
    weights: { customer: 0.3, engineer: 0.4, platform: 0.3 },
    description: "Optimize for engineer productivity",
  },
  {
    name: "Margin Protection",
    weights: { customer: 0.3, engineer: 0.3, platform: 0.4 },
    description: "Prioritize profitable allocations",
  },
];

export function WeightSliders({ weights, onChange, disabled }: WeightSlidersProps) {
  const [localWeights, setLocalWeights] = useState(weights);

  // Sync with external changes
  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  // Ensure weights always sum to 1
  const adjustWeight = (key: keyof ScoringWeights, newValue: number) => {
    const others = (Object.keys(localWeights) as (keyof ScoringWeights)[]).filter(
      (k) => k !== key
    );
    const remaining = 1 - newValue;
    const currentOthersSum = others.reduce((sum, k) => sum + localWeights[k], 0);

    const newWeights = { ...localWeights, [key]: newValue };

    // Proportionally adjust others
    if (currentOthersSum > 0) {
      others.forEach((k) => {
        newWeights[k] = (localWeights[k] / currentOthersSum) * remaining;
      });
    } else {
      others.forEach((k) => {
        newWeights[k] = remaining / others.length;
      });
    }

    setLocalWeights(newWeights);
    onChange(newWeights);
  };

  const applyPreset = (preset: (typeof presets)[0]) => {
    setLocalWeights(preset.weights);
    onChange(preset.weights);
  };

  const isPresetActive = (preset: (typeof presets)[0]) => {
    return (
      Math.abs(localWeights.customer - preset.weights.customer) < 0.01 &&
      Math.abs(localWeights.engineer - preset.weights.engineer) < 0.01 &&
      Math.abs(localWeights.platform - preset.weights.platform) < 0.01
    );
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              disabled={disabled}
              className={cn(
                "p-3 text-left border rounded-lg transition-colors",
                isPresetActive(preset)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Individual Sliders */}
      <div className="space-y-4">
        <WeightSlider
          label="Customer Priority"
          description="Time match, wait time, engineer quality, price"
          value={localWeights.customer}
          onChange={(v) => adjustWeight("customer", v)}
          color="blue"
          disabled={disabled}
        />

        <WeightSlider
          label="Engineer Priority"
          description="Travel efficiency, earnings, route continuity, workload"
          value={localWeights.engineer}
          onChange={(v) => adjustWeight("engineer", v)}
          color="green"
          disabled={disabled}
        />

        <WeightSlider
          label="Platform Priority"
          description="Margin, utilization, customer LTV, network effect"
          value={localWeights.platform}
          onChange={(v) => adjustWeight("platform", v)}
          color="purple"
          disabled={disabled}
        />
      </div>

      {/* Visual Balance */}
      <div className="mt-4">
        <div className="h-4 rounded-full overflow-hidden flex">
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${localWeights.customer * 100}%` }}
          />
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${localWeights.engineer * 100}%` }}
          />
          <div
            className="bg-purple-500 transition-all duration-300"
            style={{ width: `${localWeights.platform * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Customer {Math.round(localWeights.customer * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Engineer {Math.round(localWeights.engineer * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Platform {Math.round(localWeights.platform * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface WeightSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  color: "blue" | "green" | "purple";
  disabled?: boolean;
}

function WeightSlider({
  label,
  description,
  value,
  onChange,
  color,
  disabled,
}: WeightSliderProps) {
  const colorClasses = {
    blue: "accent-blue-500",
    green: "accent-green-500",
    purple: "accent-purple-500",
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="80"
        value={value * 100}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        disabled={disabled}
        className={cn(
          "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
          colorClasses[color],
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
