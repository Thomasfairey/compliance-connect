import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticket = searchParams.get("ticket");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  if (!ticket) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    // Create a client token from the sign-in token
    const response = await fetch(
      `https://api.clerk.com/v1/sign_in_tokens/${ticket}/verify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Ticket verification failed:", await response.text());
      return NextResponse.redirect(new URL("/sign-in?error=invalid_ticket", request.url));
    }

    // Redirect to sign-in with the ticket - Clerk will handle it
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("__clerk_ticket", ticket);
    signInUrl.searchParams.set("redirect_url", redirectTo);

    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error("Ticket auth error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=auth_failed", request.url));
  }
}
