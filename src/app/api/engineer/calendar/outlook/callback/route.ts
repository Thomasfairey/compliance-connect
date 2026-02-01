import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/engineer/calendar/outlook/callback`;
const MS_TENANT = "common";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("Microsoft OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        "/engineer/profile/calendar?error=outlook_auth_failed",
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/engineer/profile/calendar?error=invalid_request", request.url)
    );
  }

  // Verify state
  const storedState = request.cookies.get("oauth_state_ms")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/engineer/profile/calendar?error=invalid_state", request.url)
    );
  }

  try {
    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const userId = stateData.userId;

    // Check timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/engineer/profile/calendar?error=expired", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MS_CLIENT_ID!,
          client_secret: MS_CLIENT_SECRET!,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
          scope: "Calendars.ReadWrite offline_access",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Microsoft token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL(
          "/engineer/profile/calendar?error=token_exchange_failed",
          request.url
        )
      );
    }

    const tokens = await tokenResponse.json();

    // Get engineer profile
    const profile = await db.engineerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.redirect(
        new URL("/engineer/profile/calendar?error=profile_not_found", request.url)
      );
    }

    // Store or update calendar sync
    await db.calendarSync.upsert({
      where: {
        engineerProfileId_provider: {
          engineerProfileId: profile.id,
          provider: "outlook",
        },
      },
      create: {
        engineerProfileId: profile.id,
        provider: "outlook",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncEnabled: true,
        lastSyncedAt: new Date(),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncEnabled: true,
        lastSyncedAt: new Date(),
      },
    });

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL("/engineer/profile/calendar?success=outlook", request.url)
    );
    response.cookies.delete("oauth_state_ms");

    return response;
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/engineer/profile/calendar?error=callback_failed", request.url)
    );
  }
}
