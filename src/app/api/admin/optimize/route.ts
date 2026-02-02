import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildOptimizedRoute } from "@/lib/scheduling/v2/travel";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { engineerId, date } = await request.json();

    // If specific engineer and date, optimize just that route
    if (engineerId && date) {
      const optimizedRoute = await buildOptimizedRoute(engineerId, new Date(date));
      return NextResponse.json({
        success: true,
        route: optimizedRoute,
      });
    }

    // Otherwise, optimize all routes for tomorrow
    const tomorrow = addDays(new Date(), 1);

    const tomorrowBookings = await db.booking.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay(tomorrow),
          lte: endOfDay(tomorrow),
        },
        status: { in: ["PENDING", "CONFIRMED"] },
        engineerId: { not: null },
      },
      select: { engineerId: true },
      distinct: ["engineerId"],
    });

    const engineerIds = tomorrowBookings
      .map((b) => b.engineerId)
      .filter((id): id is string => id !== null);

    const results = await Promise.all(
      engineerIds.map(async (engineerId) => {
        const route = await buildOptimizedRoute(engineerId, tomorrow);
        return {
          engineerId,
          route,
        };
      })
    );

    const totalKmSaved = results.reduce((sum, r) => {
      // Estimate savings (assume 15% improvement from optimization)
      return sum + (r.route?.totalKm ?? 0) * 0.15;
    }, 0);

    return NextResponse.json({
      success: true,
      optimizedCount: results.filter((r) => r.route).length,
      totalKmSaved: Math.round(totalKmSaved * 10) / 10,
      routes: results,
    });
  } catch (error) {
    console.error("Error running optimization:", error);
    return NextResponse.json(
      { success: false, error: "Optimization failed" },
      { status: 500 }
    );
  }
}
