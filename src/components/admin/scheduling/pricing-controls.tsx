"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PricingRules {
  clusterDiscount: {
    enabled: boolean;
    radiusKm: number;
    discountPercent: number;
    minJobs: number;
  };
  flexDiscount: {
    enabled: boolean;
    discountPercent: number;
  };
  urgencyPremium: {
    enabled: boolean;
    sameDayPercent: number;
    nextDayPercent: number;
    daysThreshold: number;
  };
  offPeakDiscount: {
    enabled: boolean;
    discountPercent: number;
    days: number[];
  };
  loyaltyDiscount: {
    enabled: boolean;
    minBookings: number;
    discountPercent: number;
  };
  minimumMargin: number;
}

interface PricingControlsProps {
  rules: PricingRules;
  onChange: (rules: PricingRules) => void;
  disabled?: boolean;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PricingControls({ rules, onChange, disabled }: PricingControlsProps) {
  const [localRules, setLocalRules] = useState(rules);

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  const updateRule = <K extends keyof PricingRules>(
    key: K,
    value: PricingRules[K]
  ) => {
    const newRules = { ...localRules, [key]: value };
    setLocalRules(newRules);
    onChange(newRules);
  };

  return (
    <div className="space-y-6">
      {/* Cluster Discount */}
      <ToggleSection
        title="Cluster Discount"
        description="Discount when engineer is already nearby"
        enabled={localRules.clusterDiscount.enabled}
        onToggle={(enabled) =>
          updateRule("clusterDiscount", { ...localRules.clusterDiscount, enabled })
        }
        disabled={disabled}
      >
        <div className="grid grid-cols-3 gap-4">
          <NumberInput
            label="Radius (km)"
            value={localRules.clusterDiscount.radiusKm}
            onChange={(v) =>
              updateRule("clusterDiscount", {
                ...localRules.clusterDiscount,
                radiusKm: v,
              })
            }
            min={1}
            max={20}
            disabled={disabled}
          />
          <NumberInput
            label="Min Jobs"
            value={localRules.clusterDiscount.minJobs}
            onChange={(v) =>
              updateRule("clusterDiscount", {
                ...localRules.clusterDiscount,
                minJobs: v,
              })
            }
            min={1}
            max={5}
            disabled={disabled}
          />
          <NumberInput
            label="Discount %"
            value={localRules.clusterDiscount.discountPercent}
            onChange={(v) =>
              updateRule("clusterDiscount", {
                ...localRules.clusterDiscount,
                discountPercent: v,
              })
            }
            min={0}
            max={30}
            suffix="%"
            disabled={disabled}
          />
        </div>
      </ToggleSection>

      {/* Flexibility Discount */}
      <ToggleSection
        title="Flexibility Discount"
        description="Reward customers who are flexible on timing"
        enabled={localRules.flexDiscount.enabled}
        onToggle={(enabled) =>
          updateRule("flexDiscount", { ...localRules.flexDiscount, enabled })
        }
        disabled={disabled}
      >
        <NumberInput
          label="Discount %"
          value={localRules.flexDiscount.discountPercent}
          onChange={(v) =>
            updateRule("flexDiscount", {
              ...localRules.flexDiscount,
              discountPercent: v,
            })
          }
          min={0}
          max={25}
          suffix="%"
          disabled={disabled}
        />
      </ToggleSection>

      {/* Urgency Premium */}
      <ToggleSection
        title="Urgency Premium"
        description="Charge more for last-minute bookings"
        enabled={localRules.urgencyPremium.enabled}
        onToggle={(enabled) =>
          updateRule("urgencyPremium", { ...localRules.urgencyPremium, enabled })
        }
        disabled={disabled}
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Same Day"
            value={localRules.urgencyPremium.sameDayPercent}
            onChange={(v) =>
              updateRule("urgencyPremium", {
                ...localRules.urgencyPremium,
                sameDayPercent: v,
              })
            }
            min={0}
            max={50}
            suffix="%"
            disabled={disabled}
          />
          <NumberInput
            label="Next Day"
            value={localRules.urgencyPremium.nextDayPercent}
            onChange={(v) =>
              updateRule("urgencyPremium", {
                ...localRules.urgencyPremium,
                nextDayPercent: v,
              })
            }
            min={0}
            max={40}
            suffix="%"
            disabled={disabled}
          />
        </div>
      </ToggleSection>

      {/* Off-Peak Discount */}
      <ToggleSection
        title="Off-Peak Discount"
        description="Discount for slower days of the week"
        enabled={localRules.offPeakDiscount.enabled}
        onToggle={(enabled) =>
          updateRule("offPeakDiscount", { ...localRules.offPeakDiscount, enabled })
        }
        disabled={disabled}
      >
        <div className="space-y-3">
          <NumberInput
            label="Discount %"
            value={localRules.offPeakDiscount.discountPercent}
            onChange={(v) =>
              updateRule("offPeakDiscount", {
                ...localRules.offPeakDiscount,
                discountPercent: v,
              })
            }
            min={0}
            max={25}
            suffix="%"
            disabled={disabled}
          />
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">Off-Peak Days</Label>
            <div className="flex gap-2">
              {dayNames.map((day, i) => (
                <button
                  key={day}
                  onClick={() => {
                    const days = localRules.offPeakDiscount.days.includes(i)
                      ? localRules.offPeakDiscount.days.filter((d) => d !== i)
                      : [...localRules.offPeakDiscount.days, i];
                    updateRule("offPeakDiscount", {
                      ...localRules.offPeakDiscount,
                      days,
                    });
                  }}
                  disabled={disabled}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                    localRules.offPeakDiscount.days.includes(i)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ToggleSection>

      {/* Loyalty Discount */}
      <ToggleSection
        title="Loyalty Discount"
        description="Reward repeat customers"
        enabled={localRules.loyaltyDiscount.enabled}
        onToggle={(enabled) =>
          updateRule("loyaltyDiscount", { ...localRules.loyaltyDiscount, enabled })
        }
        disabled={disabled}
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Min Bookings"
            value={localRules.loyaltyDiscount.minBookings}
            onChange={(v) =>
              updateRule("loyaltyDiscount", {
                ...localRules.loyaltyDiscount,
                minBookings: v,
              })
            }
            min={1}
            max={20}
            disabled={disabled}
          />
          <NumberInput
            label="Discount %"
            value={localRules.loyaltyDiscount.discountPercent}
            onChange={(v) =>
              updateRule("loyaltyDiscount", {
                ...localRules.loyaltyDiscount,
                discountPercent: v,
              })
            }
            min={0}
            max={20}
            suffix="%"
            disabled={disabled}
          />
        </div>
      </ToggleSection>

      {/* Minimum Margin Protection */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Minimum Margin Floor</h4>
            <p className="text-sm text-gray-500">
              Never price below this margin, regardless of discounts
            </p>
          </div>
          <div className="w-24">
            <NumberInput
              value={localRules.minimumMargin}
              onChange={(v) => updateRule("minimumMargin", v)}
              min={10}
              max={50}
              suffix="%"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToggleSectionProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToggleSection({
  title,
  description,
  enabled,
  onToggle,
  disabled,
  children,
}: ToggleSectionProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg transition-colors",
        enabled ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-gray-50"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
      {enabled && (
        <div className="pt-3 border-t border-gray-200">{children}</div>
      )}
    </div>
  );
}

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
}: NumberInputProps) {
  return (
    <div>
      {label && (
        <Label className="text-sm text-gray-600 mb-1 block">{label}</Label>
      )}
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) {
              onChange(v);
            }
          }}
          min={min}
          max={max}
          disabled={disabled}
          className={cn("pr-8", disabled && "opacity-50")}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
