import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getOrCreateEngineerProfile, getEngineerAvailability } from "@/lib/actions/engineer";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/engineer/mobile/bottom-nav";
import { AvailabilityCalendar } from "@/components/engineer/availability-calendar";
import { addDays } from "date-fns";
import {
  Award,
  Wrench,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";

export const metadata = {
  title: "Profile | Engineer",
};

export default async function EngineerProfilePage() {
  const user = await getOrCreateUser();

  if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const profile = await getOrCreateEngineerProfile();

  if (!profile) {
    redirect("/engineer/onboarding");
  }

  // Get availability for next 4 weeks
  const today = new Date();
  const availability = await getEngineerAvailability(
    today,
    addDays(today, 28)
  );

  const getStatusBadge = () => {
    switch (profile.status) {
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Profile</h1>
          <Link href="/engineer/onboarding">
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.user.name}</h2>
                <p className="text-gray-500 text-sm">{profile.user.email}</p>
                <div className="mt-1">{getStatusBadge()}</div>
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-gray-600 mt-4 pt-4 border-t">{profile.bio}</p>
            )}

            {profile.rejectedReason && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-700">{profile.rejectedReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardContent className="p-0 divide-y">
            <ProfileLink
              href="/engineer/profile/calendar"
              icon={Calendar}
              label="Calendar Sync"
              description="Connect Google Calendar or Outlook"
            />
            <ProfileLink
              href="/engineer/jobs"
              icon={Wrench}
              label="All Jobs"
              description="View your job history"
            />
            <ProfileLink
              href="/engineer/earnings"
              icon={Award}
              label="Earnings History"
              description="View detailed earnings"
            />
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{profile.yearsExperience}</p>
            <p className="text-xs text-gray-500">Years Exp.</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{profile.competencies.length}</p>
            <p className="text-xs text-gray-500">Services</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{profile.coverageAreas.length}</p>
            <p className="text-xs text-gray-500">Areas</p>
          </div>
        </div>

        {/* Qualifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.qualifications.length === 0 ? (
              <p className="text-sm text-gray-500">No qualifications added</p>
            ) : (
              <div className="space-y-2">
                {profile.qualifications.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{q.name}</p>
                      {q.issuingBody && (
                        <p className="text-xs text-gray-500">{q.issuingBody}</p>
                      )}
                    </div>
                    {q.verified && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.competencies.length === 0 ? (
              <p className="text-sm text-gray-500">No services selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.competencies.map((c) => (
                  <Badge key={c.id} variant="secondary">
                    {c.service.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage Areas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Coverage Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.coverageAreas.length === 0 ? (
              <p className="text-sm text-gray-500">No coverage areas set</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.coverageAreas.map((a) => (
                  <Badge key={a.id} variant="outline">
                    {a.postcodePrefix} ({a.radiusKm}km)
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Links */}
        <Card>
          <CardContent className="p-0 divide-y">
            <ProfileLink
              href="/engineer/profile/settings"
              icon={Settings}
              label="Settings"
              description="Notifications and preferences"
            />
            <ProfileLink
              href="/help"
              icon={HelpCircle}
              label="Help & Support"
              description="Get help with the app"
            />
          </CardContent>
        </Card>

        {/* Availability - Desktop Only */}
        <div className="hidden lg:block">
          <AvailabilityCalendar
            initialAvailability={availability}
            calendarSyncs={profile.calendarSyncs.map((s) => ({
              provider: s.provider,
              lastSyncedAt: s.lastSyncedAt,
            }))}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav current="profile" />
    </div>
  );
}

function ProfileLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof Calendar;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}
