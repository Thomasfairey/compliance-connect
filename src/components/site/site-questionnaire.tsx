"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createOrUpdateSiteProfile } from "@/lib/actions/site-profile";
import { Building2, Loader2 } from "lucide-react";

const buildingTypes = [
  { value: "OFFICE", label: "Office" },
  { value: "RETAIL", label: "Retail / Shop" },
  { value: "WAREHOUSE", label: "Warehouse / Industrial" },
  { value: "RESTAURANT", label: "Restaurant / Cafe" },
  { value: "HOTEL", label: "Hotel / Hospitality" },
  { value: "HEALTHCARE", label: "Healthcare / Medical" },
  { value: "EDUCATION", label: "Education" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "MIXED_USE", label: "Mixed Use" },
  { value: "OTHER", label: "Other" },
];

const industryTypes = [
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "FINANCE", label: "Finance / Banking" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "RETAIL", label: "Retail" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "EDUCATION", label: "Education" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { value: "OTHER", label: "Other" },
];

type SiteQuestionnaireProps = {
  siteId: string;
  siteName: string;
  initialData?: {
    buildingType?: string;
    industryType?: string;
    floorArea?: number;
    numberOfFloors?: number;
    numberOfRooms?: number;
    hasCommercialKitchen?: boolean;
    hasServerRoom?: boolean;
    hasWorkshop?: boolean;
    hasPublicAccess?: boolean;
    yearBuilt?: number;
    lastRefurbishment?: number;
    typicalOccupancy?: number;
    numberOfWorkstations?: number;
  };
  onComplete?: () => void;
};

export function SiteQuestionnaire({
  siteId,
  siteName,
  initialData,
  onComplete,
}: SiteQuestionnaireProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [buildingType, setBuildingType] = useState(
    initialData?.buildingType || ""
  );
  const [industryType, setIndustryType] = useState(
    initialData?.industryType || ""
  );
  const [floorArea, setFloorArea] = useState(initialData?.floorArea?.toString() || "");
  const [numberOfFloors, setNumberOfFloors] = useState(
    initialData?.numberOfFloors?.toString() || ""
  );
  const [numberOfRooms, setNumberOfRooms] = useState(
    initialData?.numberOfRooms?.toString() || ""
  );
  const [hasCommercialKitchen, setHasCommercialKitchen] = useState(
    initialData?.hasCommercialKitchen || false
  );
  const [hasServerRoom, setHasServerRoom] = useState(
    initialData?.hasServerRoom || false
  );
  const [hasWorkshop, setHasWorkshop] = useState(
    initialData?.hasWorkshop || false
  );
  const [hasPublicAccess, setHasPublicAccess] = useState(
    initialData?.hasPublicAccess || false
  );
  const [yearBuilt, setYearBuilt] = useState(
    initialData?.yearBuilt?.toString() || ""
  );
  const [lastRefurbishment, setLastRefurbishment] = useState(
    initialData?.lastRefurbishment?.toString() || ""
  );
  const [typicalOccupancy, setTypicalOccupancy] = useState(
    initialData?.typicalOccupancy?.toString() || ""
  );
  const [numberOfWorkstations, setNumberOfWorkstations] = useState(
    initialData?.numberOfWorkstations?.toString() || ""
  );

  const handleSubmit = async () => {
    if (!buildingType || !industryType) {
      toast.error("Please select building and industry type");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrUpdateSiteProfile({
        siteId,
        buildingType: buildingType as any,
        industryType: industryType as any,
        floorArea: floorArea ? parseInt(floorArea) : undefined,
        numberOfFloors: numberOfFloors ? parseInt(numberOfFloors) : undefined,
        numberOfRooms: numberOfRooms ? parseInt(numberOfRooms) : undefined,
        hasCommercialKitchen,
        hasServerRoom,
        hasWorkshop,
        hasPublicAccess,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        lastRefurbishment: lastRefurbishment
          ? parseInt(lastRefurbishment)
          : undefined,
        typicalOccupancy: typicalOccupancy
          ? parseInt(typicalOccupancy)
          : undefined,
        numberOfWorkstations: numberOfWorkstations
          ? parseInt(numberOfWorkstations)
          : undefined,
      });

      if (result.success) {
        toast.success("Site profile saved successfully");
        if (onComplete) {
          onComplete();
        } else {
          router.push(`/sites/${siteId}`);
        }
      } else {
        toast.error(result.error || "Failed to save profile");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Site Profile: {siteName}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Help us recommend the right services for your premises
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buildingType">Building Type *</Label>
                <Select value={buildingType} onValueChange={setBuildingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building type" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industryType">Industry *</Label>
                <Select value={industryType} onValueChange={setIndustryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floorArea">Floor Area (sqm)</Label>
                <Input
                  id="floorArea"
                  type="number"
                  value={floorArea}
                  onChange={(e) => setFloorArea(e.target.value)}
                  placeholder="e.g., 500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfFloors">Number of Floors</Label>
                <Input
                  id="numberOfFloors"
                  type="number"
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(e.target.value)}
                  placeholder="e.g., 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfRooms">Number of Rooms</Label>
                <Input
                  id="numberOfRooms"
                  type="number"
                  value={numberOfRooms}
                  onChange={(e) => setNumberOfRooms(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base">Special Features</Label>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="hasCommercialKitchen"
                    checked={hasCommercialKitchen}
                    onCheckedChange={(checked) =>
                      setHasCommercialKitchen(!!checked)
                    }
                  />
                  <Label htmlFor="hasCommercialKitchen" className="font-normal">
                    Commercial Kitchen
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="hasServerRoom"
                    checked={hasServerRoom}
                    onCheckedChange={(checked) => setHasServerRoom(!!checked)}
                  />
                  <Label htmlFor="hasServerRoom" className="font-normal">
                    Server Room / Data Center
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="hasWorkshop"
                    checked={hasWorkshop}
                    onCheckedChange={(checked) => setHasWorkshop(!!checked)}
                  />
                  <Label htmlFor="hasWorkshop" className="font-normal">
                    Workshop / Machinery Area
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="hasPublicAccess"
                    checked={hasPublicAccess}
                    onCheckedChange={(checked) => setHasPublicAccess(!!checked)}
                  />
                  <Label htmlFor="hasPublicAccess" className="font-normal">
                    Public Access (customers visit)
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearBuilt">Year Built</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="e.g., 1990"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastRefurbishment">Last Refurbishment</Label>
                <Input
                  id="lastRefurbishment"
                  type="number"
                  value={lastRefurbishment}
                  onChange={(e) => setLastRefurbishment(e.target.value)}
                  placeholder="e.g., 2020"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="typicalOccupancy">Typical Occupancy</Label>
                <Input
                  id="typicalOccupancy"
                  type="number"
                  value={typicalOccupancy}
                  onChange={(e) => setTypicalOccupancy(e.target.value)}
                  placeholder="Number of people on a typical day"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfWorkstations">
                  Number of Workstations
                </Label>
                <Input
                  id="numberOfWorkstations"
                  type="number"
                  value={numberOfWorkstations}
                  onChange={(e) => setNumberOfWorkstations(e.target.value)}
                  placeholder="Desks with computers"
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Based on your answers, we&apos;ll automatically estimate
                quantities for services like PAT testing, fire zones, and
                emergency lighting. You can always adjust these during booking.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${
                s === step ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
