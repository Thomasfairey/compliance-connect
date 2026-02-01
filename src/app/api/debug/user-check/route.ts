import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Diagnostic endpoint to check user consistency
// DELETE THIS IN PRODUCTION
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    const clerkUser = await currentUser();

    if (!clerkId || !clerkUser) {
      return NextResponse.json({
        authenticated: false,
        error: "Not authenticated",
      });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    // Check user by clerkId
    const userByClerkId = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true, clerkId: true, role: true },
    });

    // Check user by email
    const userByEmail = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, clerkId: true, role: true },
    });

    // Get sites for both user IDs (if different)
    let sitesForClerkUser: { id: string; name: string; userId: string }[] = [];
    let sitesForEmailUser: { id: string; name: string; userId: string }[] = [];

    if (userByClerkId) {
      sitesForClerkUser = await db.site.findMany({
        where: { userId: userByClerkId.id },
        select: { id: true, name: true, userId: true },
      });
    }

    if (userByEmail && userByEmail.id !== userByClerkId?.id) {
      sitesForEmailUser = await db.site.findMany({
        where: { userId: userByEmail.id },
        select: { id: true, name: true, userId: true },
      });
    }

    // Get total sites count
    const totalSites = await db.site.count();

    return NextResponse.json({
      authenticated: true,
      clerk: {
        userId: clerkId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      database: {
        userByClerkId: userByClerkId || null,
        userByEmail: userByEmail || null,
        userIdMatch: userByClerkId?.id === userByEmail?.id,
        clerkIdMatch: userByClerkId?.clerkId === clerkId,
      },
      sites: {
        forClerkUser: sitesForClerkUser,
        forEmailUser: sitesForEmailUser,
        totalInDatabase: totalSites,
      },
      diagnosis: {
        hasUserMismatch: userByClerkId?.id !== userByEmail?.id && userByEmail !== null,
        noUserFound: !userByClerkId && !userByEmail,
        sitesOrphaned: sitesForEmailUser.length > 0 && userByClerkId?.id !== userByEmail?.id,
      },
    });
  } catch (error) {
    console.error("[debug/user-check] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
