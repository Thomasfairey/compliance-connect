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
        debug.userData = user ? { id: user.id, role: user.role, email: user.email } : null;
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
