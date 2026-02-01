"use client";

import { useState } from "react";
import { Save, RotateCcw, Scale, PoundSterling, MapPin, Gauge } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightSliders } from "@/components/admin/scheduling/weight-sliders";
import { PricingControls, type PricingRules } from "@/components/admin/scheduling/pricing-controls";
import type { ScoringWeights } from "@/lib/scheduling/v2/types";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/scheduling/v2/types";

interface SchedulingControlClientProps {
  initialWeights: ScoringWeights;
  initialRules: PricingRules;
}

const defaultRules: PricingRules = {
  clusterDiscount: {
    enabled: true,
    radiusKm: 5,
    discountPercent: 10,
    minJobs: 1,
  },
  flexDiscount: {
    enabled: true,
    discountPercent: 7,
  },
  urgencyPremium: {
    enabled: true,
    sameDayPercent: 15,
    nextDayPercent: 10,
    daysThreshold: 2,
  },
  offPeakDiscount: {
    enabled: true,
    discountPercent: 5,
    days: [1, 2],
  },
  loyaltyDiscount: {
    enabled: true,
    minBookings: 5,
    discountPercent: 5,
  },
  minimumMargin: 25,
};

export function SchedulingControlClient({
  initialWeights,
  initialRules,
}: SchedulingControlClientProps) {
  const [weights, setWeights] = useState<ScoringWeights>(initialWeights);
  const [rules, setRules] = useState<PricingRules>(initialRules);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleWeightsChange = (newWeights: ScoringWeights) => {
    setWeights(newWeights);
    setHasChanges(true);
  };

  const handleRulesChange = (newRules: PricingRules) => {
    setRules(newRules);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setWeights(DEFAULT_SCORING_WEIGHTS);
    setRules(defaultRules);
    setHasChanges(true);
    toast.info("Reset to defaults. Save to apply changes.");
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/scheduling/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights, rules }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setHasChanges(false);
      toast.success("Scheduling settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Scheduling Control"
      description="Configure how bookings are allocated and priced"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving || !hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      {hasChanges && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          You have unsaved changes. Click "Save Changes" to apply them.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Weights */}
        <SettingsCard
          title="Allocation Weights"
          description="Balance priorities between customers, engineers, and platform"
          icon={Scale}
        >
          <WeightSliders
            weights={weights}
            onChange={handleWeightsChange}
            disabled={saving}
          />
        </SettingsCard>

        {/* Pricing Rules */}
        <SettingsCard
          title="Dynamic Pricing"
          description="Configure discounts and premiums"
          icon={PoundSterling}
        >
          <PricingControls
            rules={rules}
            onChange={handleRulesChange}
            disabled={saving}
          />
        </SettingsCard>

        {/* Cluster Settings */}
        <SettingsCard
          title="Cluster Detection"
          description="Configure when jobs are considered 'clustered'"
          icon={MapPin}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cluster detection is configured through the Cluster Discount settings
              in Dynamic Pricing. Jobs within the specified radius are considered
              part of the same cluster.
            </p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Current Radius:</span>
                  <span className="ml-2 font-medium">{rules.clusterDiscount.radiusKm} km</span>
                </div>
                <div>
                  <span className="text-gray-500">Min Jobs:</span>
                  <span className="ml-2 font-medium">{rules.clusterDiscount.minJobs}</span>
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Capacity Settings */}
        <SettingsCard
          title="Capacity Management"
          description="Control booking limits and availability"
          icon={Gauge}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Max Jobs Per Day</div>
                <div className="text-2xl font-semibold mt-1">6</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Buffer Between Jobs</div>
                <div className="text-2xl font-semibold mt-1">30 min</div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Capacity settings are managed per-engineer in their profile settings.
              These defaults apply to new engineers.
            </p>
          </div>
        </SettingsCard>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">How Scheduling Works</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            The scheduling system uses a <strong>multi-objective optimization</strong> approach
            to find the best engineer for each booking:
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>
              <strong>Customer factors</strong> (time match, wait time, engineer quality, price fit)
            </li>
            <li>
              <strong>Engineer factors</strong> (travel efficiency, earnings, route continuity, workload)
            </li>
            <li>
              <strong>Platform factors</strong> (margin, utilization, customer LTV, network effect)
            </li>
          </ul>
          <p>
            Adjust the weights above to change how these factors are balanced.
            Higher customer weight means better customer experience but potentially
            lower efficiency. Higher engineer weight optimizes for travel and workload.
          </p>
        </div>
      </div>
    </AdminPage>
  );
}

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function SettingsCard({ title, description, icon: Icon, children }: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
