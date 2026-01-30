"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { addMonths, isBefore, addDays } from "date-fns";

export type ComplianceStatus = {
  siteId: string;
  siteName: string;
  serviceId: string;
  serviceName: string;
  lastTestDate: Date | null;
  nextDueDate: Date;
  status: "CURRENT" | "DUE_SOON" | "OVERDUE";
  daysUntilDue: number;
  autoRebookEnabled: boolean;
};

export async function getComplianceStatus(): Promise<ComplianceStatus[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get all sites for the user
    const sites = await db.site.findMany({
      where: { userId: user.id },
    });

    if (sites.length === 0) return [];

    // Get services with compliance intervals
    const services = await db.service.findMany({
      where: {
        isActive: true,
        complianceIntervalMonths: { not: null },
      },
    });

    const statuses: ComplianceStatus[] = [];
    const today = new Date();

    for (const site of sites) {
      for (const service of services) {
        // Find the last completed booking for this service at this site
        const lastBooking = await db.booking.findFirst({
          where: {
            siteId: site.id,
            serviceId: service.id,
            status: "COMPLETED",
          },
          orderBy: { completedAt: "desc" },
        });

        // Check if there's a compliance reminder
        const reminder = await db.complianceReminder.findUnique({
          where: { siteId_serviceId: { siteId: site.id, serviceId: service.id } },
        });

        const lastTestDate = lastBooking?.completedAt || null;
        const intervalMonths = service.complianceIntervalMonths || 12;

        let nextDueDate: Date;
        if (lastTestDate) {
          nextDueDate = addMonths(lastTestDate, intervalMonths);
        } else {
          // If never tested, consider it overdue
          nextDueDate = today;
        }

        const daysUntilDue = Math.ceil(
          (nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status: "CURRENT" | "DUE_SOON" | "OVERDUE";
        if (daysUntilDue < 0) {
          status = "OVERDUE";
        } else if (daysUntilDue <= 30) {
          status = "DUE_SOON";
        } else {
          status = "CURRENT";
        }

        statuses.push({
          siteId: site.id,
          siteName: site.name,
          serviceId: service.id,
          serviceName: service.name,
          lastTestDate,
          nextDueDate,
          status,
          daysUntilDue,
          autoRebookEnabled: reminder?.autoRebookEnabled || false,
        });
      }
    }

    // Sort by urgency
    statuses.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return statuses;
  } catch (error) {
    console.error("Error fetching compliance status:", error);
    return [];
  }
}

export async function enableAutoRebook(
  siteId: string,
  serviceId: string,
  preferences: {
    preferredSlot?: string;
    preferredDayOfWeek?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify site ownership
    const site = await db.site.findUnique({
      where: { id: siteId },
    });

    if (!site || site.userId !== user.id) {
      return { success: false, error: "Site not found or unauthorized" };
    }

    // Get last completed booking
    const lastBooking = await db.booking.findFirst({
      where: {
        siteId,
        serviceId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
    });

    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service?.complianceIntervalMonths) {
      return { success: false, error: "Service has no compliance interval" };
    }

    const nextDueDate = lastBooking?.completedAt
      ? addMonths(lastBooking.completedAt, service.complianceIntervalMonths)
      : new Date();

    await db.complianceReminder.upsert({
      where: { siteId_serviceId: { siteId, serviceId } },
      update: {
        autoRebookEnabled: true,
        preferredSlot: preferences.preferredSlot,
        preferredDayOfWeek: preferences.preferredDayOfWeek,
      },
      create: {
        customerId: user.id,
        siteId,
        serviceId,
        lastBookingId: lastBooking?.id,
        lastTestDate: lastBooking?.completedAt,
        nextDueDate,
        autoRebookEnabled: true,
        preferredSlot: preferences.preferredSlot,
        preferredDayOfWeek: preferences.preferredDayOfWeek,
      },
    });

    revalidatePath("/compliance");
    return { success: true };
  } catch (error) {
    console.error("Error enabling auto-rebook:", error);
    return { success: false, error: "Failed to enable auto-rebook" };
  }
}

export async function disableAutoRebook(
  siteId: string,
  serviceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    await db.complianceReminder.update({
      where: { siteId_serviceId: { siteId, serviceId } },
      data: { autoRebookEnabled: false },
    });

    revalidatePath("/compliance");
    return { success: true };
  } catch (error) {
    console.error("Error disabling auto-rebook:", error);
    return { success: false, error: "Failed to disable auto-rebook" };
  }
}

// Called by a cron job to process auto-rebookings
export async function processAutoRebookings(): Promise<{
  processed: number;
  created: number;
  errors: number;
}> {
  const stats = { processed: 0, created: 0, errors: 0 };

  try {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    // Find reminders where:
    // - Auto-rebook is enabled
    // - Next due date is within 30 days
    // - No pending/confirmed booking exists for this service/site
    const reminders = await db.complianceReminder.findMany({
      where: {
        autoRebookEnabled: true,
        nextDueDate: { lte: thirtyDaysFromNow },
      },
      include: {
        customer: true,
      },
    });

    for (const reminder of reminders) {
      stats.processed++;

      try {
        // Check if there's already a pending/confirmed booking
        const existingBooking = await db.booking.findFirst({
          where: {
            siteId: reminder.siteId,
            serviceId: reminder.serviceId,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });

        if (existingBooking) {
          continue; // Already has a booking
        }

        // Get site and service details
        const [site, service] = await Promise.all([
          db.site.findUnique({
            where: { id: reminder.siteId },
            include: { profile: true },
          }),
          db.service.findUnique({ where: { id: reminder.serviceId } }),
        ]);

        if (!site || !service) continue;

        // Calculate scheduled date based on preferences
        let scheduledDate = reminder.nextDueDate;

        // Adjust to preferred day of week if set
        if (reminder.preferredDayOfWeek !== null) {
          const currentDay = scheduledDate.getDay();
          const targetDay = reminder.preferredDayOfWeek;
          const daysToAdd = (targetDay - currentDay + 7) % 7;
          scheduledDate = addDays(scheduledDate, daysToAdd);
        }

        // Ensure it's not in the past
        if (isBefore(scheduledDate, today)) {
          scheduledDate = addDays(today, 7); // Schedule for next week
        }

        // Calculate quantity from site profile
        let qty = 1;
        if (site.profile) {
          switch (service.slug) {
            case "pat-testing":
              qty = site.profile.estimatedPATItems || 50;
              break;
            case "fire-alarm-testing":
              qty = site.profile.estimatedFireZones || 4;
              break;
            case "emergency-lighting":
              qty = site.profile.estimatedEmergencyLights || 15;
              break;
            case "fixed-wire-testing":
              qty = site.profile.estimatedCircuits || 12;
              break;
            case "fire-extinguisher-servicing":
              qty = site.profile.estimatedExtinguishers || 6;
              break;
          }
        }

        const price = Math.max(service.basePrice * qty, service.minCharge);

        // Create the booking
        await db.booking.create({
          data: {
            customerId: reminder.customerId,
            siteId: reminder.siteId,
            serviceId: reminder.serviceId,
            scheduledDate,
            slot: reminder.preferredSlot || "AM",
            estimatedQty: qty,
            quotedPrice: price,
            notes: "Auto-booked for compliance renewal",
            estimatedDuration: Math.ceil(
              service.baseMinutes + service.minutesPerUnit * qty
            ),
          },
        });

        stats.created++;
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        stats.errors++;
      }
    }

    return stats;
  } catch (error) {
    console.error("Error in processAutoRebookings:", error);
    return stats;
  }
}

// Upsell suggestions based on site profile and compliance gaps
export async function getUpsellSuggestions(): Promise<Array<{
  id: string;
  siteId: string;
  siteName: string;
  serviceId: string;
  serviceName: string;
  reason: string;
  priority: number;
  estimatedPrice: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const suggestions = await db.upsellSuggestion.findMany({
      where: {
        customerId: user.id,
        status: "PENDING",
      },
      orderBy: { priority: "desc" },
    });

    // Enrich with service and site names
    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        const [site, service] = await Promise.all([
          db.site.findUnique({ where: { id: s.siteId } }),
          db.service.findUnique({ where: { id: s.serviceId } }),
        ]);

        const siteProfile = await db.siteProfile.findUnique({
          where: { siteId: s.siteId },
        });

        let qty = 1;
        if (siteProfile && service) {
          switch (service.slug) {
            case "pat-testing":
              qty = siteProfile.estimatedPATItems || 50;
              break;
            case "fire-alarm-testing":
              qty = siteProfile.estimatedFireZones || 4;
              break;
            default:
              qty = 1;
          }
        }

        const estimatedPrice = service
          ? Math.max(service.basePrice * qty, service.minCharge)
          : 0;

        return {
          id: s.id,
          siteId: s.siteId,
          siteName: site?.name || "Unknown",
          serviceId: s.serviceId,
          serviceName: service?.name || "Unknown",
          reason: s.reason,
          priority: s.priority,
          estimatedPrice: Math.round(estimatedPrice * 100) / 100,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("Error fetching upsell suggestions:", error);
    return [];
  }
}

export async function dismissUpsell(
  suggestionId: string
): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await db.upsellSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error dismissing upsell:", error);
    return { success: false };
  }
}

export async function acceptUpsell(
  suggestionId: string
): Promise<{ success: boolean; bookingId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const suggestion = await db.upsellSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.customerId !== user.id) {
      return { success: false };
    }

    // Redirect to booking page with pre-filled data
    await db.upsellSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error accepting upsell:", error);
    return { success: false };
  }
}

// Generate upsell suggestions based on site profiles
export async function generateUpsellSuggestions(
  customerId: string
): Promise<number> {
  try {
    const sites = await db.site.findMany({
      where: { userId: customerId },
      include: { profile: true },
    });

    const services = await db.service.findMany({
      where: { isActive: true },
    });

    let created = 0;

    for (const site of sites) {
      if (!site.profile) continue;

      for (const service of services) {
        // Check if they've ever booked this service for this site
        const existingBooking = await db.booking.findFirst({
          where: {
            siteId: site.id,
            serviceId: service.id,
          },
        });

        if (existingBooking) continue; // Already a customer for this service

        // Check if there's already a suggestion
        const existingSuggestion = await db.upsellSuggestion.findFirst({
          where: {
            customerId,
            siteId: site.id,
            serviceId: service.id,
            status: "PENDING",
          },
        });

        if (existingSuggestion) continue;

        // Determine if we should suggest this service
        let reason = "";
        let priority = 0;

        const profile = site.profile;

        switch (service.slug) {
          case "dse-assessment":
            if (profile.numberOfWorkstations && profile.numberOfWorkstations > 5) {
              reason = `With ${profile.numberOfWorkstations} workstations, DSE assessments are legally required`;
              priority = 8;
            }
            break;

          case "legionella-risk-assessment":
            if (profile.buildingType === "HOTEL" || profile.buildingType === "HEALTHCARE") {
              reason = "Legionella risk assessment is required for your building type";
              priority = 9;
            }
            break;

          case "fire-risk-assessment":
            if (profile.hasPublicAccess) {
              reason = "Fire risk assessment is required for premises with public access";
              priority = 10;
            }
            break;

          case "thermographic-survey":
            if (profile.hasServerRoom) {
              reason = "Thermographic survey recommended for server room equipment";
              priority = 6;
            }
            break;
        }

        if (reason) {
          await db.upsellSuggestion.create({
            data: {
              customerId,
              siteId: site.id,
              serviceId: service.id,
              reason,
              priority,
            },
          });
          created++;
        }
      }
    }

    return created;
  } catch (error) {
    console.error("Error generating upsell suggestions:", error);
    return 0;
  }
}
