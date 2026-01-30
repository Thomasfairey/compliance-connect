import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { getOrCreateEngineerProfile, getEngineerAvailability } from "@/lib/actions/engineer";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export const metadata = {
  title: "Engineer Profile",
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
            Pending Approval
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
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your engineer profile and availability"
        action={
          <Link href="/engineer/onboarding">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                  {profile.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profile.user.name}</h2>
                  {getStatusBadge()}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.user.email}</span>
                </div>
                {profile.user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{profile.user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.yearsExperience} years experience</span>
                </div>
                {profile.dayRate && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Day Rate:</span>
                    <span className="font-semibold">£{profile.dayRate}</span>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {profile.rejectedReason && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{profile.rejectedReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Qualifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.qualifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No qualifications added</p>
              ) : (
                <div className="space-y-2">
                  {profile.qualifications.map((q) => (
                    <div key={q.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm">{q.name}</p>
                      {q.issuingBody && (
                        <p className="text-xs text-muted-foreground">{q.issuingBody}</p>
                      )}
                      {q.verified && (
                        <Badge variant="secondary" className="mt-1 text-xs">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.competencies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services selected</p>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Coverage Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.coverageAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coverage areas set</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.coverageAreas.map((a) => (
                    <Badge key={a.id} variant="outline">
                      {a.postcodePrefix}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Availability Calendar */}
        <div className="lg:col-span-2">
          <AvailabilityCalendar
            initialAvailability={availability}
            calendarSyncs={profile.calendarSyncs.map((s) => ({
              provider: s.provider,
              lastSyncedAt: s.lastSyncedAt,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
