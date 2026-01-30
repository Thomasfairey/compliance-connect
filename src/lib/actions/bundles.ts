"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type BundleWithServices = {
  id: string;
  name: string;
  slug: string;
  description: string;
  discountPercent: number;
  icon: string | null;
  recommendedFor: string[];
  items: {
    id: string;
    isRequired: boolean;
    includedQty: number | null;
    service: {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      minCharge: number;
      unitName: string;
    };
  }[];
};

export async function getBundles(): Promise<BundleWithServices[]> {
  try {
    const bundles = await db.serviceBundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return bundles;
  } catch (error) {
    console.error("Error fetching bundles:", error);
    return [];
  }
}

export async function getBundleBySlug(slug: string): Promise<BundleWithServices | null> {
  try {
    const bundle = await db.serviceBundle.findUnique({
      where: { slug },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    return bundle;
  } catch (error) {
    console.error("Error fetching bundle:", error);
    return null;
  }
}

export async function getRecommendedBundles(siteId: string): Promise<BundleWithServices[]> {
  try {
    const siteProfile = await db.siteProfile.findUnique({
      where: { siteId },
    });

    if (!siteProfile) {
      return getBundles();
    }

    const bundles = await db.serviceBundle.findMany({
      where: {
        isActive: true,
        recommendedFor: { has: siteProfile.buildingType },
      },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return bundles;
  } catch (error) {
    console.error("Error fetching recommended bundles:", error);
    return [];
  }
}

export type BundlePriceQuote = {
  bundleId: string;
  bundleName: string;
  services: {
    serviceId: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  originalTotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
};

export async function calculateBundlePrice(
  bundleId: string,
  siteId: string,
  quantities: Record<string, number>
): Promise<BundlePriceQuote | null> {
  try {
    const bundle = await db.serviceBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!bundle) return null;

    // Get site profile for default quantities
    const siteProfile = await db.siteProfile.findUnique({
      where: { siteId },
    });

    const services: BundlePriceQuote["services"] = [];
    let originalTotal = 0;

    for (const item of bundle.items) {
      const service = item.service;
      let quantity = quantities[service.id];

      // Use site profile estimates if no quantity provided
      if (quantity === undefined && siteProfile) {
        switch (service.slug) {
          case "pat-testing":
            quantity = siteProfile.estimatedPATItems || 50;
            break;
          case "fire-alarm-testing":
            quantity = siteProfile.estimatedFireZones || 4;
            break;
          case "emergency-lighting":
            quantity = siteProfile.estimatedEmergencyLights || 15;
            break;
          case "fixed-wire-testing":
            quantity = siteProfile.estimatedCircuits || 12;
            break;
          case "fire-extinguisher-servicing":
            quantity = siteProfile.estimatedExtinguishers || 6;
            break;
          case "dse-assessment":
            quantity = siteProfile.numberOfWorkstations || 10;
            break;
          default:
            quantity = 1;
        }
      }

      if (quantity === undefined) quantity = 1;

      const subtotal = Math.max(service.basePrice * quantity, service.minCharge);
      originalTotal += subtotal;

      services.push({
        serviceId: service.id,
        serviceName: service.name,
        quantity,
        unitPrice: service.basePrice,
        subtotal,
      });
    }

    const discountAmount = originalTotal * (bundle.discountPercent / 100);
    const finalTotal = originalTotal - discountAmount;

    return {
      bundleId: bundle.id,
      bundleName: bundle.name,
      services,
      originalTotal: Math.round(originalTotal * 100) / 100,
      discountPercent: bundle.discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
    };
  } catch (error) {
    console.error("Error calculating bundle price:", error);
    return null;
  }
}

export async function purchaseBundle(
  bundleId: string,
  siteId: string,
  quantities: Record<string, number>,
  scheduledDate: Date,
  slot: string
): Promise<{ success: boolean; bookingIds?: string[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const bundle = await db.serviceBundle.findUnique({
      where: { id: bundleId },
      include: {
        items: {
          include: { service: true },
        },
      },
    });

    if (!bundle) {
      return { success: false, error: "Bundle not found" };
    }

    const site = await db.site.findUnique({
      where: { id: siteId },
      include: { profile: true },
    });

    if (!site || site.userId !== user.id) {
      return { success: false, error: "Site not found or unauthorized" };
    }

    // Calculate pricing
    const quote = await calculateBundlePrice(bundleId, siteId, quantities);
    if (!quote) {
      return { success: false, error: "Failed to calculate price" };
    }

    // Create bookings for each service in the bundle
    const bookingIds: string[] = [];

    for (const serviceQuote of quote.services) {
      const service = bundle.items.find(
        (item) => item.service.id === serviceQuote.serviceId
      )?.service;

      if (!service) continue;

      // Apply bundle discount to each service
      const serviceDiscount = serviceQuote.subtotal * (bundle.discountPercent / 100);
      const discountedPrice = serviceQuote.subtotal - serviceDiscount;

      const booking = await db.booking.create({
        data: {
          customerId: user.id,
          siteId,
          serviceId: service.id,
          scheduledDate,
          slot,
          estimatedQty: serviceQuote.quantity,
          quotedPrice: Math.round(discountedPrice * 100) / 100,
          originalPrice: serviceQuote.subtotal,
          discountPercent: bundle.discountPercent,
          notes: `Part of bundle: ${bundle.name}`,
          estimatedDuration: Math.ceil(
            service.baseMinutes + service.minutesPerUnit * serviceQuote.quantity
          ),
        },
      });

      bookingIds.push(booking.id);
    }

    // Create the bundle purchase record
    await db.bookingBundle.create({
      data: {
        bundleId,
        customerId: user.id,
        siteId,
        bookingIds,
        totalOriginalPrice: quote.originalTotal,
        totalDiscountedPrice: quote.finalTotal,
        discountPercent: quote.discountPercent,
      },
    });

    revalidatePath("/bookings");
    revalidatePath("/dashboard");

    return { success: true, bookingIds };
  } catch (error) {
    console.error("Error purchasing bundle:", error);
    return { success: false, error: "Failed to create bookings" };
  }
}

export async function getCustomerBundlePurchases() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const purchases = await db.bookingBundle.findMany({
      where: { customerId: user.id },
      include: {
        bundle: true,
      },
      orderBy: { purchasedAt: "desc" },
    });

    return purchases;
  } catch (error) {
    console.error("Error fetching bundle purchases:", error);
    return [];
  }
}
