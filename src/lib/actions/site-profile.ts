"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BuildingType, IndustryType } from "@prisma/client";

export type SiteProfileData = {
  id: string;
  siteId: string;
  buildingType: BuildingType;
  industryType: IndustryType;
  floorArea: number | null;
  numberOfFloors: number | null;
  numberOfRooms: number | null;
  hasCommercialKitchen: boolean;
  hasServerRoom: boolean;
  hasWorkshop: boolean;
  hasPublicAccess: boolean;
  yearBuilt: number | null;
  lastRefurbishment: number | null;
  estimatedPATItems: number | null;
  estimatedFireZones: number | null;
  estimatedEmergencyLights: number | null;
  estimatedCircuits: number | null;
  estimatedExtinguishers: number | null;
  estimatedCCTVCameras: number | null;
  typicalOccupancy: number | null;
  numberOfWorkstations: number | null;
  epcRating: string | null;
  epcCertificateNumber: string | null;
  questionnaireComplete: boolean;
};

export async function getSiteProfile(siteId: string): Promise<SiteProfileData | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Verify site ownership
    const site = await db.site.findUnique({
      where: { id: siteId },
      include: { profile: true },
    });

    if (!site || site.userId !== user.id) {
      return null;
    }

    return site.profile;
  } catch (error) {
    console.error("Error fetching site profile:", error);
    return null;
  }
}

export type CreateSiteProfileInput = {
  siteId: string;
  buildingType: BuildingType;
  industryType: IndustryType;
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

export async function createOrUpdateSiteProfile(
  input: CreateSiteProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify site ownership
    const site = await db.site.findUnique({
      where: { id: input.siteId },
    });

    if (!site || site.userId !== user.id) {
      return { success: false, error: "Site not found or unauthorized" };
    }

    // Calculate estimated quantities based on building info
    const estimates = calculateEstimates(input);

    const { siteId, ...profileData } = input;

    await db.siteProfile.upsert({
      where: { siteId },
      update: {
        ...profileData,
        ...estimates,
        questionnaireComplete: true,
        completedAt: new Date(),
      },
      create: {
        siteId,
        ...profileData,
        ...estimates,
        questionnaireComplete: true,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/sites/${input.siteId}`);
    revalidatePath("/sites");

    return { success: true };
  } catch (error) {
    console.error("Error creating/updating site profile:", error);
    return { success: false, error: "Failed to save profile" };
  }
}

function calculateEstimates(input: CreateSiteProfileInput) {
  const { floorArea, numberOfFloors, numberOfRooms, buildingType, hasServerRoom, hasWorkshop, numberOfWorkstations } = input;
  const area = floorArea || 500;
  const floors = numberOfFloors || 1;
  const rooms = numberOfRooms || Math.ceil(area / 50);

  // PAT items estimate based on building type and size
  let patMultiplier = 0.1; // items per sqm
  if (buildingType === "OFFICE") patMultiplier = 0.15;
  if (buildingType === "EDUCATION") patMultiplier = 0.2;
  if (buildingType === "RETAIL") patMultiplier = 0.08;
  if (buildingType === "WAREHOUSE") patMultiplier = 0.03;
  if (hasServerRoom) patMultiplier += 0.05;

  const estimatedPATItems = Math.ceil(area * patMultiplier);

  // Fire zones estimate (typically 1 per 500-1000 sqm per floor)
  const estimatedFireZones = Math.max(floors * 2, Math.ceil(area / 500));

  // Emergency lights (1 per 50 sqm approximately)
  const estimatedEmergencyLights = Math.ceil(area / 50);

  // Circuits (based on floor area and type)
  let circuitMultiplier = 0.015;
  if (buildingType === "WAREHOUSE" || buildingType === "MANUFACTURING") circuitMultiplier = 0.025;
  if (hasWorkshop) circuitMultiplier += 0.01;
  const estimatedCircuits = Math.max(8, Math.ceil(area * circuitMultiplier));

  // Fire extinguishers (1 per 200 sqm typically)
  const estimatedExtinguishers = Math.max(2, Math.ceil(area / 200));

  return {
    estimatedPATItems,
    estimatedFireZones,
    estimatedEmergencyLights,
    estimatedCircuits,
    estimatedExtinguishers,
  };
}

// Gov.uk EPC API integration (stubbed for future implementation)
export async function lookupEPCData(postcode: string, address: string): Promise<{
  success: boolean;
  data?: {
    epcRating: string;
    epcCertificateNumber: string;
  };
  error?: string;
}> {
  // TODO: Implement gov.uk EPC API integration
  // API endpoint: https://epc.opendatacommunities.org/api/v1/domestic/search
  // Requires API key registration

  console.log(`EPC lookup requested for ${address}, ${postcode}`);

  // Return stub data for now
  return {
    success: false,
    error: "EPC lookup not yet implemented - coming soon",
  };
}

export type ServiceRecommendation = {
  serviceId: string;
  serviceName: string;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimatedQuantity: number;
  estimatedPrice: number;
  isRequired: boolean; // Required by law for this building type
};

export async function getServiceRecommendations(siteId: string): Promise<ServiceRecommendation[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const site = await db.site.findUnique({
      where: { id: siteId },
      include: { profile: true },
    });

    if (!site || site.userId !== user.id || !site.profile) {
      return [];
    }

    const profile = site.profile;
    const services = await db.service.findMany({ where: { isActive: true } });
    const recommendations: ServiceRecommendation[] = [];

    for (const service of services) {
      let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      let reason = "";
      let isRequired = false;
      let estimatedQuantity = 1;

      switch (service.slug) {
        case "pat-testing":
          priority = "HIGH";
          reason = "Annual PAT testing recommended for all businesses with electrical equipment";
          isRequired = true;
          estimatedQuantity = profile.estimatedPATItems || 50;
          break;

        case "fire-alarm-testing":
          if (profile.hasPublicAccess || profile.buildingType === "HOTEL" || profile.buildingType === "RESTAURANT") {
            priority = "HIGH";
            reason = "Fire alarm testing required for premises with public access";
            isRequired = true;
          } else {
            priority = "MEDIUM";
            reason = "Recommended annual fire alarm testing";
          }
          estimatedQuantity = profile.estimatedFireZones || 4;
          break;

        case "emergency-lighting":
          priority = "HIGH";
          reason = "Emergency lighting testing required for all commercial premises";
          isRequired = true;
          estimatedQuantity = profile.estimatedEmergencyLights || 15;
          break;

        case "fixed-wire-testing":
          const yearsSinceEICR = profile.lastRefurbishment
            ? new Date().getFullYear() - profile.lastRefurbishment
            : 10;
          if (yearsSinceEICR >= 5) {
            priority = "HIGH";
            reason = "EICR due - last inspection over 5 years ago";
            isRequired = true;
          } else {
            priority = "LOW";
            reason = "EICR recommended every 5 years";
          }
          estimatedQuantity = profile.estimatedCircuits || 12;
          break;

        case "fire-risk-assessment":
          if (profile.hasPublicAccess) {
            priority = "HIGH";
            reason = "Fire risk assessment legally required for premises with public access";
            isRequired = true;
          } else {
            priority = "MEDIUM";
            reason = "Fire risk assessment required for all businesses";
            isRequired = true;
          }
          break;

        case "dse-assessment":
          if (profile.numberOfWorkstations && profile.numberOfWorkstations > 0) {
            priority = "MEDIUM";
            reason = "DSE assessments required for employees using display screens";
            isRequired = true;
            estimatedQuantity = profile.numberOfWorkstations;
          } else {
            continue; // Skip if no workstations
          }
          break;

        case "legionella-risk-assessment":
          if (profile.buildingType === "HOTEL" || profile.buildingType === "HEALTHCARE") {
            priority = "HIGH";
            reason = "Legionella risk assessment legally required for your building type";
            isRequired = true;
          } else {
            priority = "LOW";
            reason = "Legionella risk assessment recommended for all premises with water systems";
          }
          break;

        case "fire-extinguisher-servicing":
          priority = "HIGH";
          reason = "Annual fire extinguisher servicing required";
          isRequired = true;
          estimatedQuantity = profile.estimatedExtinguishers || 6;
          break;

        default:
          continue;
      }

      const estimatedPrice = Math.max(
        service.basePrice * estimatedQuantity,
        service.minCharge
      );

      recommendations.push({
        serviceId: service.id,
        serviceName: service.name,
        reason,
        priority,
        estimatedQuantity,
        estimatedPrice: Math.round(estimatedPrice * 100) / 100,
        isRequired,
      });
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  } catch (error) {
    console.error("Error getting service recommendations:", error);
    return [];
  }
}
