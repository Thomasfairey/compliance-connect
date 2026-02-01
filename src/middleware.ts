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
  "/api/debug(.*)", // Debug endpoints - REMOVE IN PRODUCTION
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Exclude static files and PWA assets from middleware
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)",
    "/(api|trpc)(.*)",
  ],
};
