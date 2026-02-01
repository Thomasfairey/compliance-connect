"use server";

import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// PAT Test rate: 45p per test
const PAT_TEST_RATE = 0.45;

// Electrician labour percentage: 40%
const ELECTRICIAN_LABOUR_PERCENTAGE = 0.40;

// Assumed materials percentage (rest is labour)
const MATERIALS_PERCENTAGE = 0.25;

export type CompensationSummary = {
  periodStart: Date;
  periodEnd: Date;
  patTests: {
    count: number;
    earnings: number;
  };
  electricianJobs: {
    count: number;
    labourTotal: number;
    earnings: number;
  };
  consultantDays: {
    count: number;
    dayRate: number;
    earnings: number;
  };
  totalEarnings: number;
};

/**
 * Log PAT test count for a completed booking
 */
export async function logPATTestCount(
  bookingId: string,
  itemsTested: number,
  notes?: string
): Promise<{ success: boolean; earnings?: number; error?: string }> {
  try {
    const user = await getOrCreateUser();

    // Get the booking and verify engineer owns it
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        engineer: {
          include: {
            engineerProfile: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    if (!booking.engineer?.engineerProfile) {
      return { success: false, error: "Engineer profile not found" };
    }

    // Check if PAT test log already exists
    const existingLog = await db.pATTestLog.findUnique({
      where: { bookingId },
    });

    if (existingLog) {
      return { success: false, error: "PAT test count already logged" };
    }

    // Calculate earnings
    const rate = booking.engineer.engineerProfile.testRate ?? PAT_TEST_RATE;
    const totalEarnings = itemsTested * rate;

    // Create the PAT test log
    await db.pATTestLog.create({
      data: {
        bookingId,
        engineerProfileId: booking.engineer.engineerProfile.id,
        itemsTested,
        ratePerTest: rate,
        totalEarnings,
        notes,
      },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath("/engineer/earnings");

    return { success: true, earnings: totalEarnings };
  } catch (error) {
    console.error("Failed to log PAT test count:", error);
    return { success: false, error: "Failed to log PAT test count" };
  }
}

/**
 * Calculate electrician earnings for a completed job
 * Earnings = (quotedPrice * (1 - materialsPercentage)) * labourPercentage
 */
export async function calculateElectricianEarnings(
  bookingId: string
): Promise<{ success: boolean; earnings?: number; error?: string }> {
  try {
    const user = await getOrCreateUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        engineer: {
          include: {
            engineerProfile: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    if (!booking.engineer?.engineerProfile) {
      return { success: false, error: "Engineer profile not found" };
    }

    // Calculate labour element (total minus materials)
    const labourElement = booking.quotedPrice * (1 - MATERIALS_PERCENTAGE);

    // Calculate electrician earnings (40% of labour)
    const percentage = booking.engineer.engineerProfile.labourPercentage ?? ELECTRICIAN_LABOUR_PERCENTAGE;
    const earnings = labourElement * percentage;

    return { success: true, earnings };
  } catch (error) {
    console.error("Failed to calculate electrician earnings:", error);
    return { success: false, error: "Failed to calculate earnings" };
  }
}

/**
 * Get engineer earnings summary for a period
 */
export async function getEngineerEarnings(
  periodStart: Date,
  periodEnd: Date
): Promise<CompensationSummary | null> {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ENGINEER") {
      return null;
    }

    const engineerProfile = await db.engineerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!engineerProfile) {
      return null;
    }

    // Get PAT test logs for the period
    const patLogs = await db.pATTestLog.findMany({
      where: {
        engineerProfileId: engineerProfile.id,
        loggedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const patTestCount = patLogs.reduce((sum, log) => sum + log.itemsTested, 0);
    const patEarnings = patLogs.reduce((sum, log) => sum + log.totalEarnings, 0);

    // Get completed bookings for electrician calculations
    const completedBookings = await db.booking.findMany({
      where: {
        engineerId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        service: true,
      },
    });

    // Calculate electrician earnings (for electrical services)
    const electricalServices = ["fixed-wire-testing", "pat-testing", "thermographic-survey", "thermal-imaging"];
    const electricianBookings = completedBookings.filter(
      (b) => electricalServices.includes(b.service.slug) && !patLogs.some((p) => p.bookingId === b.id)
    );

    const labourTotal = electricianBookings.reduce(
      (sum, b) => sum + b.quotedPrice * (1 - MATERIALS_PERCENTAGE),
      0
    );
    const electricianEarnings = labourTotal * (engineerProfile.labourPercentage ?? ELECTRICIAN_LABOUR_PERCENTAGE);

    // Calculate consultant day earnings
    const consultantServices = ["fire-risk-assessment", "health-safety-assessment", "legionella-risk-assessment"];
    const consultantBookings = completedBookings.filter((b) =>
      consultantServices.includes(b.service.slug)
    );

    const consultantDays = consultantBookings.length;
    const dayRate = engineerProfile.dayRate ?? 400;
    const consultantEarnings = consultantDays * dayRate;

    return {
      periodStart,
      periodEnd,
      patTests: {
        count: patTestCount,
        earnings: patEarnings,
      },
      electricianJobs: {
        count: electricianBookings.length,
        labourTotal,
        earnings: electricianEarnings,
      },
      consultantDays: {
        count: consultantDays,
        dayRate,
        earnings: consultantEarnings,
      },
      totalEarnings: patEarnings + electricianEarnings + consultantEarnings,
    };
  } catch (error) {
    console.error("Failed to get engineer earnings:", error);
    return null;
  }
}

/**
 * Get current month's earnings summary
 */
export async function getCurrentMonthEarnings(): Promise<CompensationSummary | null> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return getEngineerEarnings(periodStart, periodEnd);
}
