import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // Test Clerk auth
    const { userId } = await auth();
    debug.clerkUserId = userId || "not authenticated";

    if (userId) {
      const clerkUser = await currentUser();
      debug.clerkEmail = clerkUser?.emailAddresses[0]?.emailAddress || "no email";
      debug.clerkName = `${clerkUser?.firstName} ${clerkUser?.lastName}`;
    }

    // Test database connection
    try {
      const userCount = await db.user.count();
      debug.dbConnection = "success";
      debug.userCount = userCount;
    } catch (dbError) {
      debug.dbConnection = "failed";
      debug.dbError = dbError instanceof Error ? dbError.message : String(dbError);
    }

    // Test user lookup if authenticated
    if (userId) {
      try {
        const user = await db.user.findUnique({
          where: { clerkId: userId },
        });
        debug.userFound = !!user;
        debug.userData = user ? { id: user.id, role: user.role, email: user.email, name: user.name } : null;

        // Test customer data queries (same as dashboard)
        if (user) {
          try {
            const [totalBookings, pendingBookings, completedBookings, totalSites] =
              await Promise.all([
                db.booking.count({ where: { customerId: user.id } }),
                db.booking.count({
                  where: { customerId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
                }),
                db.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
                db.site.count({ where: { userId: user.id } }),
              ]);
            debug.customerData = {
              totalBookings,
              pendingBookings,
              completedBookings,
              totalSites,
            };
          } catch (dataError) {
            debug.customerDataError = dataError instanceof Error ? dataError.message : String(dataError);
          }

          // Test booking fetch with relations
          try {
            const bookings = await db.booking.findMany({
              where: { customerId: user.id },
              include: {
                site: true,
                service: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            });
            debug.bookingsCount = bookings.length;
            debug.firstBooking = bookings[0] ? {
              id: bookings[0].id,
              status: bookings[0].status,
              siteName: bookings[0].site?.name,
              serviceName: bookings[0].service?.name,
            } : null;
          } catch (bookingError) {
            debug.bookingFetchError = bookingError instanceof Error ? bookingError.message : String(bookingError);
          }
        }
      } catch (lookupError) {
        debug.userLookupError = lookupError instanceof Error ? lookupError.message : String(lookupError);
      }
    }

    return NextResponse.json(debug);
  } catch (error) {
    return NextResponse.json({
      ...debug,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
