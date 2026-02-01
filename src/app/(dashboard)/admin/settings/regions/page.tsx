import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Users, Edit2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Regions & Zones | Admin",
  description: "Configure geographic coverage areas",
};

export default async function RegionsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get coverage data from engineer profiles
  const coverageAreas = await db.engineerCoverageArea.findMany({
    include: {
      engineerProfile: {
        include: { user: true },
      },
    },
  });

  // Group by postcode prefix
  const regionMap = new Map<string, { postcode: string; engineers: string[]; radius: number }>();

  coverageAreas.forEach((area) => {
    const existing = regionMap.get(area.postcodePrefix);
    if (existing) {
      if (!existing.engineers.includes(area.engineerProfile.user.name)) {
        existing.engineers.push(area.engineerProfile.user.name);
      }
      existing.radius = Math.max(existing.radius, area.radiusKm);
    } else {
      regionMap.set(area.postcodePrefix, {
        postcode: area.postcodePrefix,
        engineers: [area.engineerProfile.user.name],
        radius: area.radiusKm,
      });
    }
  });

  const regions = Array.from(regionMap.values()).sort((a, b) =>
    a.postcode.localeCompare(b.postcode)
  );

  // Calculate coverage stats
  const totalPostcodes = regions.length;
  const coveredByMultiple = regions.filter((r) => r.engineers.length > 1).length;
  const avgEngineers = regions.length > 0
    ? Math.round((regions.reduce((sum, r) => sum + r.engineers.length, 0) / regions.length) * 10) / 10
    : 0;

  return (
    <AdminPage
      title="Regions & Zones"
      description="Configure geographic coverage and service areas"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalPostcodes}</div>
            <div className="text-sm text-gray-500">Postcode Areas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{coveredByMultiple}</div>
            <div className="text-sm text-gray-500">Multi-Engineer Coverage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgEngineers}</div>
            <div className="text-sm text-gray-500">Avg. Engineers/Area</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {coverageAreas.length > 0
                ? Math.round(coverageAreas.reduce((sum, a) => sum + a.radiusKm, 0) / coverageAreas.length)
                : 0} km
            </div>
            <div className="text-sm text-gray-500">Avg. Coverage Radius</div>
          </CardContent>
        </Card>
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((region) => (
          <Card key={region.postcode}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{region.postcode}</CardTitle>
                    <CardDescription>{region.radius} km radius</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Users className="w-4 h-4" />
                <span>{region.engineers.length} engineer{region.engineers.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {region.engineers.slice(0, 3).map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {region.engineers.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{region.engineers.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {regions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Regions Configured</h3>
            <p className="text-gray-500 mt-2">
              Coverage areas are configured through engineer profiles.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">About Regions</h4>
        <p className="text-sm text-blue-800">
          Regions are derived from engineer coverage areas. Each engineer specifies their
          base postcode and coverage radius in their profile. The scheduling system uses
          this data to match engineers to jobs in their service area.
        </p>
      </div>
    </AdminPage>
  );
}
