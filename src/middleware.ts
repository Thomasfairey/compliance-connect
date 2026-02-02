import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/engineer/login(.*)",
  "/engineer/signup(.*)",
  "/api/webhooks(.*)",
  "/api/auth(.*)",
  "/api/engineer/calendar/ical(.*)", // iCal feed is public (uses userId in URL)
  // Clerk internal routes
  "/.well-known(.*)",
  "/sso-callback(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip protection for public routes
  if (isPublicRoute(req)) {
    return;
  }

  // Protect all other routes
  try {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  } catch (error) {
    // If auth.protect throws (which it shouldn't normally),
    // redirect to sign-in instead of showing an error
    console.error("Auth protection error:", error);
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return Response.redirect(signInUrl.toString());
  }
});

export const config = {
  matcher: [
    // Exclude static files and PWA assets from middleware
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)",
    "/(api|trpc)(.*)",
  ],
};
