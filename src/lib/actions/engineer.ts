"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireRole, getOrCreateUser } from "@/lib/auth";
import type { EngineerStatus, Prisma } from "@prisma/client";

// Types for engineer profile
export type EngineerProfileWithRelations = Prisma.EngineerProfileGetPayload<{
  include: {
    user: true;
    qualifications: true;
    competencies: { include: { service: true } };
    coverageAreas: true;
    availability: true;
    calendarSyncs: true;
  };
}>;

export type CreateEngineerProfileInput = {
  yearsExperience: number;
  bio?: string;
  dayRate?: number;
  qualifications: {
    name: string;
    issuingBody?: string;
    certificateNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
  }[];
  competencies: {
    serviceId: string;
    experienceYears?: number;
    certified?: boolean;
  }[];
  coverageAreas: {
    postcodePrefix: string;
    radiusKm?: number;
  }[];
};

// Get or create engineer profile for the current user
export async function getOrCreateEngineerProfile(): Promise<EngineerProfileWithRelations | null> {
  const user = await getOrCreateUser();

  // Check if user is already an engineer or admin
  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    // Upgrade to engineer role
    await db.user.update({
      where: { id: user.id },
      data: { role: "ENGINEER" },
    });
  }

  // Check for existing profile
  let profile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: true,
      qualifications: true,
      competencies: { include: { service: true } },
      coverageAreas: true,
      availability: true,
      calendarSyncs: true,
    },
  });

  // Create profile if it doesn't exist
  if (!profile) {
    // For demo mode: auto-approve engineers immediately
    profile = await db.engineerProfile.create({
      data: {
        userId: user.id,
        status: "APPROVED", // Auto-approve for demo
        approvedAt: new Date(),
      },
      include: {
        user: true,
        qualifications: true,
        competencies: { include: { service: true } },
        coverageAreas: true,
        availability: true,
        calendarSyncs: true,
      },
    });
  }

  return profile;
}

// Get engineer profile by user ID (admin use)
export async function getEngineerProfileById(
  userId: string
): Promise<EngineerProfileWithRelations | null> {
  await requireRole(["ADMIN"]);

  const profile = await db.engineerProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      qualifications: true,
      competencies: { include: { service: true } },
      coverageAreas: true,
      availability: true,
      calendarSyncs: true,
    },
  });

  return profile;
}

// Update engineer profile
export async function updateEngineerProfile(
  data: Partial<CreateEngineerProfileInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const profile = await db.engineerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Update basic info
    await db.engineerProfile.update({
      where: { id: profile.id },
      data: {
        yearsExperience: data.yearsExperience,
        bio: data.bio,
        dayRate: data.dayRate,
      },
    });

    // Update qualifications if provided
    if (data.qualifications) {
      // Delete existing and recreate
      await db.engineerQualification.deleteMany({
        where: { engineerProfileId: profile.id },
      });

      if (data.qualifications.length > 0) {
        await db.engineerQualification.createMany({
          data: data.qualifications.map((q) => ({
            engineerProfileId: profile.id,
            name: q.name,
            issuingBody: q.issuingBody,
            certificateNumber: q.certificateNumber,
            issueDate: q.issueDate,
            expiryDate: q.expiryDate,
          })),
        });
      }
    }

    // Update competencies if provided
    if (data.competencies) {
      // Delete existing and recreate
      await db.engineerCompetency.deleteMany({
        where: { engineerProfileId: profile.id },
      });

      if (data.competencies.length > 0) {
        await db.engineerCompetency.createMany({
          data: data.competencies.map((c) => ({
            engineerProfileId: profile.id,
            serviceId: c.serviceId,
            experienceYears: c.experienceYears || 0,
            certified: c.certified || false,
          })),
        });
      }
    }

    // Update coverage areas if provided
    if (data.coverageAreas) {
      // Delete existing and recreate
      await db.engineerCoverageArea.deleteMany({
        where: { engineerProfileId: profile.id },
      });

      if (data.coverageAreas.length > 0) {
        await db.engineerCoverageArea.createMany({
          data: data.coverageAreas.map((a) => ({
            engineerProfileId: profile.id,
            postcodePrefix: a.postcodePrefix.toUpperCase(),
            radiusKm: a.radiusKm || 20,
          })),
        });
      }
    }

    revalidatePath("/engineer/profile");
    revalidatePath("/engineer/onboarding");

    return { success: true };
  } catch (error) {
    console.error("Error updating engineer profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

// Submit profile for approval
export async function submitProfileForApproval(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requireUser();

    const profile = await db.engineerProfile.findUnique({
      where: { userId: user.id },
      include: {
        qualifications: true,
        competencies: true,
        coverageAreas: true,
      },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Validate profile completeness
    if (profile.qualifications.length === 0) {
      return { success: false, error: "Please add at least one qualification" };
    }

    if (profile.competencies.length === 0) {
      return { success: false, error: "Please select at least one service you can perform" };
    }

    if (profile.coverageAreas.length === 0) {
      return { success: false, error: "Please add at least one coverage area" };
    }

    // Update status to pending approval
    await db.engineerProfile.update({
      where: { id: profile.id },
      data: { status: "PENDING_APPROVAL" },
    });

    revalidatePath("/engineer/profile");
    revalidatePath("/engineer/onboarding");
    revalidatePath("/admin/engineers");

    return { success: true };
  } catch (error) {
    console.error("Error submitting profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit profile",
    };
  }
}

// Admin: Get all engineer profiles
export async function getAllEngineerProfiles(
  status?: EngineerStatus
): Promise<EngineerProfileWithRelations[]> {
  await requireRole(["ADMIN"]);

  const profiles = await db.engineerProfile.findMany({
    where: status ? { status } : undefined,
    include: {
      user: true,
      qualifications: true,
      competencies: { include: { service: true } },
      coverageAreas: true,
      availability: true,
      calendarSyncs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return profiles;
}

// Admin: Approve engineer
export async function approveEngineer(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    await db.engineerProfile.update({
      where: { id: profileId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        rejectedReason: null,
      },
    });

    revalidatePath("/admin/engineers");

    return { success: true };
  } catch (error) {
    console.error("Error approving engineer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve engineer",
    };
  }
}

// Admin: Reject engineer
export async function rejectEngineer(
  profileId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    await db.engineerProfile.update({
      where: { id: profileId },
      data: {
        status: "REJECTED",
        rejectedReason: reason,
      },
    });

    revalidatePath("/admin/engineers");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting engineer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject engineer",
    };
  }
}

// Admin: Suspend engineer
export async function suspendEngineer(
  profileId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    await db.engineerProfile.update({
      where: { id: profileId },
      data: {
        status: "SUSPENDED",
        rejectedReason: reason,
      },
    });

    revalidatePath("/admin/engineers");

    return { success: true };
  } catch (error) {
    console.error("Error suspending engineer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to suspend engineer",
    };
  }
}

// Get available services for competencies
export async function getAvailableServices() {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return services;
}

// Set engineer availability
export async function setEngineerAvailability(
  dates: { date: Date; slot: string; isAvailable: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const profile = await db.engineerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Upsert availability records
    for (const item of dates) {
      await db.engineerAvailability.upsert({
        where: {
          engineerProfileId_date_slot: {
            engineerProfileId: profile.id,
            date: item.date,
            slot: item.slot,
          },
        },
        update: { isAvailable: item.isAvailable },
        create: {
          engineerProfileId: profile.id,
          date: item.date,
          slot: item.slot,
          isAvailable: item.isAvailable,
        },
      });
    }

    revalidatePath("/engineer/profile");
    revalidatePath("/engineer");

    return { success: true };
  } catch (error) {
    console.error("Error setting availability:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set availability",
    };
  }
}

// Get engineer availability for a date range
export async function getEngineerAvailability(
  startDate: Date,
  endDate: Date
): Promise<{ date: Date; slot: string; isAvailable: boolean }[]> {
  const user = await requireUser();

  const profile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return [];
  }

  const availability = await db.engineerAvailability.findMany({
    where: {
      engineerProfileId: profile.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return availability.map((a) => ({
    date: a.date,
    slot: a.slot,
    isAvailable: a.isAvailable,
  }));
}

// Admin: Setup engineer for auto-allocation
// This approves the engineer and adds all competencies + broad UK coverage
export async function setupEngineerForAutoAllocation(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"]);

    // Get or create engineer profile
    let profile = await db.engineerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create profile
      profile = await db.engineerProfile.create({
        data: {
          userId,
          status: "APPROVED",
          approvedAt: new Date(),
          yearsExperience: 5,
          bio: "Experienced compliance testing engineer",
        },
      });
    } else {
      // Update to approved
      await db.engineerProfile.update({
        where: { id: profile.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
    }

    // Get all active services
    const services = await db.service.findMany({
      where: { isActive: true },
    });

    // Add competencies for all services
    for (const service of services) {
      await db.engineerCompetency.upsert({
        where: {
          engineerProfileId_serviceId: {
            engineerProfileId: profile.id,
            serviceId: service.id,
          },
        },
        update: { certified: true, experienceYears: 5 },
        create: {
          engineerProfileId: profile.id,
          serviceId: service.id,
          certified: true,
          experienceYears: 5,
        },
      });
    }

    // Add broad UK coverage areas (common postcode prefixes)
    const ukPostcodes = [
      // London
      "E", "EC", "N", "NW", "SE", "SW", "W", "WC",
      // Major cities
      "B", "M", "L", "G", "EH", "CF", "BS", "LE", "NG", "S",
      "NE", "SR", "DH", "TS", "DL", "HG", "YO", "LS", "BD", "HX",
      "WF", "HD", "DN", "HU", "LN", "PE", "CB", "IP", "NR", "CO",
      "CM", "SS", "RM", "IG", "DA", "BR", "CR", "SM", "KT", "TW",
      "UB", "HA", "EN", "WD", "AL", "SG", "HP", "LU", "MK", "NN",
      "CV", "WS", "WV", "DY", "B", "ST", "DE", "SK", "CW", "WA",
      "CH", "PR", "BL", "OL", "BB", "FY", "LA", "CA", "DG", "TD",
      "ML", "KA", "PA", "FK", "KY", "DD", "PH", "AB", "IV", "KW",
      "BT", "SA", "LD", "SY", "LL", "CH",
      "OX", "RG", "SL", "GU", "PO", "SO", "SP", "BA", "SN", "GL",
      "HR", "WR", "TF", "BN", "RH", "TN", "CT", "ME", "EX", "PL",
      "TQ", "TR", "DT", "TA", "JE", "GY", "IM",
    ];

    for (const postcode of ukPostcodes) {
      await db.engineerCoverageArea.upsert({
        where: {
          engineerProfileId_postcodePrefix: {
            engineerProfileId: profile.id,
            postcodePrefix: postcode,
          },
        },
        update: { radiusKm: 50 },
        create: {
          engineerProfileId: profile.id,
          postcodePrefix: postcode,
          radiusKm: 50,
        },
      });
    }

    // Also ensure user has ENGINEER role
    await db.user.update({
      where: { id: userId },
      data: { role: "ENGINEER" },
    });

    revalidatePath("/admin/engineers");

    return { success: true };
  } catch (error) {
    console.error("Error setting up engineer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to setup engineer",
    };
  }
}

// Admin: Setup all engineers for auto-allocation
export async function setupAllEngineersForAutoAllocation(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    await requireRole(["ADMIN"]);

    // Get all users with ENGINEER role
    const engineers = await db.user.findMany({
      where: { role: "ENGINEER" },
    });

    let count = 0;
    for (const engineer of engineers) {
      const result = await setupEngineerForAutoAllocation(engineer.id);
      if (result.success) count++;
    }

    return { success: true, count };
  } catch (error) {
    console.error("Error setting up all engineers:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Failed to setup engineers",
    };
  }
}
