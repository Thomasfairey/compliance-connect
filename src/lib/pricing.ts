import { db } from "@/lib/db";
import type { Service, Site } from "@prisma/client";

// Discount tiers based on proximity and existing bookings
const DISCOUNT_SAME_LOCATION = 0.50; // 50% - Same location on same day
const DISCOUNT_SAME_POSTCODE = 0.25; // 25% - Same postcode area on same day
const DISCOUNT_ADJACENT_DAY = 0.10; // 10% - Adjacent day with nearby booking

// Maximum drive time for "nearby" consideration (in minutes)
const MAX_DRIVE_TIME_MINUTES = 20;

// Approximate km per minute of driving in UK urban areas
const KM_PER_MINUTE = 0.5;

type PricingResult = {
  originalPrice: number;
  discountPercent: number;
  discountedPrice: number;
  discountReason?: string;
};

type DurationResult = {
  estimatedMinutes: number;
  slot: "AM" | "PM" | "FULL_DAY";
};

/**
 * Calculate dynamic pricing based on existing bookings and proximity
 */
export async function calculateDynamicPrice(
  service: Service,
  site: Site,
  scheduledDate: Date,
  estimatedQty: number
): Promise<PricingResult> {
  // Calculate base price
  const calculatedPrice = service.basePrice * estimatedQty;
  const originalPrice = Math.max(calculatedPrice, service.minCharge);

  // Get the date boundaries for checking
  const startOfDay = new Date(scheduledDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(scheduledDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check for existing bookings on the same day
  const sameDayBookings = await db.booking.findMany({
    where: {
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
      },
    },
    include: {
      site: true,
    },
  });

  // Check for same location bookings (highest discount)
  const sameLocationBooking = sameDayBookings.find(
    (booking) => booking.siteId === site.id
  );

  if (sameLocationBooking) {
    return {
      originalPrice,
      discountPercent: DISCOUNT_SAME_LOCATION * 100,
      discountedPrice: originalPrice * (1 - DISCOUNT_SAME_LOCATION),
      discountReason: "Same location discount - another service booked here today",
    };
  }

  // Check for same postcode prefix bookings
  const sitePostcodePrefix = extractPostcodePrefix(site.postcode);
  const samePostcodeBooking = sameDayBookings.find((booking) => {
    const bookingPostcodePrefix = extractPostcodePrefix(booking.site.postcode);
    return bookingPostcodePrefix === sitePostcodePrefix;
  });

  if (samePostcodeBooking) {
    return {
      originalPrice,
      discountPercent: DISCOUNT_SAME_POSTCODE * 100,
      discountedPrice: originalPrice * (1 - DISCOUNT_SAME_POSTCODE),
      discountReason: `Area discount - booking in ${sitePostcodePrefix} area today`,
    };
  }

  // Check for nearby bookings on same day (within 20 min drive)
  if (site.latitude && site.longitude) {
    const maxDistance = MAX_DRIVE_TIME_MINUTES * KM_PER_MINUTE;

    const nearbyBooking = sameDayBookings.find((booking) => {
      if (!booking.site.latitude || !booking.site.longitude) return false;

      const distance = calculateDistance(
        site.latitude!,
        site.longitude!,
        booking.site.latitude,
        booking.site.longitude
      );

      return distance <= maxDistance;
    });

    if (nearbyBooking) {
      return {
        originalPrice,
        discountPercent: DISCOUNT_SAME_POSTCODE * 100,
        discountedPrice: originalPrice * (1 - DISCOUNT_SAME_POSTCODE),
        discountReason: "Proximity discount - nearby booking on same day",
      };
    }
  }

  // Check for adjacent day bookings
  const dayBefore = new Date(scheduledDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const dayAfter = new Date(scheduledDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const adjacentDayBookings = await db.booking.findMany({
    where: {
      OR: [
        {
          scheduledDate: {
            gte: new Date(dayBefore.setHours(0, 0, 0, 0)),
            lte: new Date(dayBefore.setHours(23, 59, 59, 999)),
          },
        },
        {
          scheduledDate: {
            gte: new Date(dayAfter.setHours(0, 0, 0, 0)),
            lte: new Date(dayAfter.setHours(23, 59, 59, 999)),
          },
        },
      ],
      status: {
        in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
      },
    },
    include: {
      site: true,
    },
  });

  // Check for nearby bookings on adjacent days
  if (site.latitude && site.longitude) {
    const maxDistance = MAX_DRIVE_TIME_MINUTES * KM_PER_MINUTE;

    const nearbyAdjacentBooking = adjacentDayBookings.find((booking) => {
      if (!booking.site.latitude || !booking.site.longitude) return false;

      const distance = calculateDistance(
        site.latitude!,
        site.longitude!,
        booking.site.latitude,
        booking.site.longitude
      );

      return distance <= maxDistance;
    });

    if (nearbyAdjacentBooking) {
      return {
        originalPrice,
        discountPercent: DISCOUNT_ADJACENT_DAY * 100,
        discountedPrice: originalPrice * (1 - DISCOUNT_ADJACENT_DAY),
        discountReason: "Adjacent day discount - nearby booking the day before/after",
      };
    }
  }

  // Check for same postcode on adjacent days
  const adjacentPostcodeBooking = adjacentDayBookings.find((booking) => {
    const bookingPostcodePrefix = extractPostcodePrefix(booking.site.postcode);
    return bookingPostcodePrefix === sitePostcodePrefix;
  });

  if (adjacentPostcodeBooking) {
    return {
      originalPrice,
      discountPercent: DISCOUNT_ADJACENT_DAY * 100,
      discountedPrice: originalPrice * (1 - DISCOUNT_ADJACENT_DAY),
      discountReason: `Adjacent day discount - booking in ${sitePostcodePrefix} area nearby`,
    };
  }

  // No discount applicable
  return {
    originalPrice,
    discountPercent: 0,
    discountedPrice: originalPrice,
  };
}

/**
 * Calculate estimated duration for a service
 */
export function calculateDuration(
  service: Service,
  estimatedQty: number
): DurationResult {
  // Base time + time per unit
  const estimatedMinutes = Math.ceil(
    service.baseMinutes + service.minutesPerUnit * estimatedQty
  );

  // Determine slot based on duration
  // AM slot: jobs under 3 hours (180 minutes)
  // PM slot: jobs under 3 hours
  // FULL_DAY: jobs over 3 hours
  let slot: "AM" | "PM" | "FULL_DAY" = "AM";

  if (estimatedMinutes > 180) {
    slot = "FULL_DAY";
  }

  return {
    estimatedMinutes,
    slot,
  };
}

/**
 * Extract postcode prefix (outward code) from a UK postcode
 * Examples: "SW1A 1AA" -> "SW1A", "EC1 2AB" -> "EC1", "W1 1AA" -> "W1"
 */
function extractPostcodePrefix(postcode: string): string {
  // Remove spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();

  // UK postcodes: outward code is everything except last 3 characters
  if (cleaned.length > 3) {
    return cleaned.slice(0, -3);
  }

  return cleaned;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get available discount for display purposes (without creating a booking)
 */
export async function getAvailableDiscount(
  serviceId: string,
  siteId: string,
  scheduledDate: Date,
  estimatedQty: number
): Promise<PricingResult | null> {
  const service = await db.service.findUnique({
    where: { id: serviceId },
  });

  const site = await db.site.findUnique({
    where: { id: siteId },
  });

  if (!service || !site) {
    return null;
  }

  return calculateDynamicPrice(service, site, scheduledDate, estimatedQty);
}
