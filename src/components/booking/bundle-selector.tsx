"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Flame,
  Zap,
  ChefHat,
  Building,
  Laptop,
  GraduationCap,
  Check,
  ChevronRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { BundleWithServices } from "@/lib/actions/bundles";

const iconMap: Record<string, React.ElementType> = {
  Package,
  Flame,
  Zap,
  ChefHat,
  Building,
  Laptop,
  GraduationCap,
};

type BundleSelectorProps = {
  bundles: BundleWithServices[];
  recommendedBundles?: BundleWithServices[];
  onSelectBundle: (bundle: BundleWithServices) => void;
  onSkip: () => void;
};

export function BundleSelector({
  bundles,
  recommendedBundles,
  onSelectBundle,
  onSkip,
}: BundleSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const recommended = recommendedBundles || [];
  const other = bundles.filter(
    (b) => !recommended.some((r) => r.id === b.id)
  );

  const handleSelect = (bundle: BundleWithServices) => {
    setSelectedId(bundle.id);
    onSelectBundle(bundle);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Choose a Service Bundle
        </h2>
        <p className="text-gray-500 mt-1">
          Save up to 25% by booking multiple services together, or skip to book
          individual services.
        </p>
      </div>

      {recommended.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Recommended for Your Site
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {recommended.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                isSelected={selectedId === bundle.id}
                isRecommended
                onSelect={() => handleSelect(bundle)}
              />
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            {recommended.length > 0 ? "Other Bundles" : "Available Bundles"}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {other.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                isSelected={selectedId === bundle.id}
                onSelect={() => handleSelect(bundle)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button variant="ghost" onClick={onSkip}>
          Skip - Book Individual Service
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

type BundleCardProps = {
  bundle: BundleWithServices;
  isSelected: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
};

function BundleCard({
  bundle,
  isSelected,
  isRecommended,
  onSelect,
}: BundleCardProps) {
  const Icon = iconMap[bundle.icon || "Package"] || Package;

  // Calculate min total price
  const minTotal = bundle.items.reduce((sum, item) => {
    return sum + item.service.minCharge;
  }, 0);

  const discountedMin = minTotal * (1 - bundle.discountPercent / 100);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "ring-2 ring-blue-500 border-blue-500"
          : "hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isRecommended ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  isRecommended ? "text-blue-600" : "text-gray-600"
                }`}
              />
            </div>
            <div>
              <CardTitle className="text-base">{bundle.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Save {bundle.discountPercent}%
                </Badge>
                {isRecommended && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {isSelected && (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-3">{bundle.description}</p>

        <div className="space-y-1 mb-3">
          <p className="text-xs text-gray-400 uppercase">Includes:</p>
          <div className="flex flex-wrap gap-1">
            {bundle.items.map((item) => (
              <Badge key={item.id} variant="outline" className="text-xs">
                {item.service.name}
                {!item.isRequired && " (optional)"}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-2 border-t">
          <span className="text-xs text-gray-500">From</span>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(discountedMin)}
            </span>
            <span className="text-sm text-gray-400 line-through ml-2">
              {formatPrice(minTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
