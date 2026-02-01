import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Microsoft OAuth configuration
const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/engineer/calendar/outlook/callback`;
const MS_TENANT = "common"; // Use "common" for multi-tenant

// Initiate Microsoft OAuth flow
export async function GET(request: NextRequest) {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!MS_CLIENT_ID) {
    return NextResponse.json(
      { error: "Microsoft OAuth not configured" },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = Buffer.from(
    JSON.stringify({ userId: user.id, timestamp: Date.now() })
  ).toString("base64");

  // Store state in a cookie for verification
  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: MS_CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        response_mode: "query",
        scope: "Calendars.ReadWrite offline_access",
        state,
      }).toString()
  );

  response.cookies.set("oauth_state_ms", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}

// Disconnect Outlook Calendar
export async function DELETE(request: NextRequest) {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Remove Outlook calendar sync
  await db.calendarSync.deleteMany({
    where: {
      engineerProfileId: profile.id,
      provider: "outlook",
    },
  });

  return NextResponse.json({ success: true });
}
