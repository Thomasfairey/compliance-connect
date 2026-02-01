import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import { CalendarSyncClient } from "./client";
import {
  ArrowLeft,
  Calendar,
  Check,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar Sync | Engineer",
};

// Placeholder icons for calendar providers
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.227-.59.227h-8.16v-7.342l1.633 1.238c.127.096.27.144.43.144.16 0 .303-.048.43-.144l6.258-4.746c.09-.072.163-.157.22-.254.055-.096.013-.178-.017-.177zm-9 11.281h9.172c.236 0 .433-.072.59-.216.158-.145.238-.333.238-.566V6.312c0-.07-.02-.133-.06-.19-.04-.055-.09-.103-.152-.143l-6.5-4.867c-.127-.096-.27-.143-.43-.143-.16 0-.302.047-.43.143l-6.5 4.867c-.06.04-.112.088-.152.143-.04.057-.06.12-.06.19v12.574z" />
      <path fill="#0078D4" d="M0 5.5v13c0 .277.223.5.5.5h13c.277 0 .5-.223.5-.5v-13c0-.277-.223-.5-.5-.5H.5c-.277 0-.5.223-.5.5z" />
      <path fill="#fff" d="M7 9.5c-1.933 0-3.5 1.567-3.5 3.5s1.567 3.5 3.5 3.5 3.5-1.567 3.5-3.5-1.567-3.5-3.5-3.5zm0 5.5c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2z" />
    </svg>
  );
}

export default async function CalendarSyncPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await getOrCreateUser();
  const params = await searchParams;

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get engineer profile with calendar syncs
  const profile = await db.engineerProfile.findUnique({
    where: { userId: user.id },
    include: {
      calendarSyncs: true,
    },
  });

  const googleSync = profile?.calendarSyncs.find((s) => s.provider === "google");
  const outlookSync = profile?.calendarSyncs.find((s) => s.provider === "outlook");

  const isGoogleConnected = !!googleSync && googleSync.syncEnabled;
  const isOutlookConnected = !!outlookSync && outlookSync.syncEnabled;
  const icalFeedUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.complianceod.co.uk"}/api/engineer/calendar/ical/${user.id}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/engineer/profile" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Calendar Sync</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Success/Error Messages */}
        {params.success === "google" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">Google Calendar connected successfully!</p>
          </div>
        )}
        {params.success === "outlook" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">Outlook Calendar connected successfully!</p>
          </div>
        )}
        {params.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">
              Failed to connect calendar. Please try again.
            </p>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Sync your jobs with your personal calendar so your family knows when you'll be home.
          </p>
        </div>

        {/* Google Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription>Sync jobs to your Google Calendar</CardDescription>
              </div>
              {isGoogleConnected ? (
                <Badge className="bg-green-100 text-green-700 border-0">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isGoogleConnected ? (
              <CalendarSyncClient
                provider="google"
                lastSyncedAt={googleSync?.lastSyncedAt?.toISOString()}
              />
            ) : (
              <Link href="/api/engineer/calendar/google">
                <Button className="w-full">
                  <GoogleIcon />
                  <span className="ml-2">Connect Google Calendar</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Outlook Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center">
                <OutlookIcon />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Outlook / Microsoft 365</CardTitle>
                <CardDescription>Sync jobs to your Outlook calendar</CardDescription>
              </div>
              {isOutlookConnected ? (
                <Badge className="bg-green-100 text-green-700 border-0">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isOutlookConnected ? (
              <CalendarSyncClient
                provider="outlook"
                lastSyncedAt={outlookSync?.lastSyncedAt?.toISOString()}
              />
            ) : (
              <Link href="/api/engineer/calendar/outlook">
                <Button className="w-full" variant="outline">
                  <OutlookIcon />
                  <span className="ml-2">Connect Outlook</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* iCal Feed */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">iCal Feed (Subscribe)</CardTitle>
                <CardDescription>Subscribe from Apple Calendar or any app</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CalendarSyncClient provider="ical" icalFeedUrl={icalFeedUrl} />
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-gray-900 mb-2">How it works</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Jobs appear as events in your calendar</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Includes customer name, address, and service details</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Updates automatically when jobs change</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Share with family so they know your schedule</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav current="profile" />
    </div>
  );
}
