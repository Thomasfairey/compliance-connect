import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Map,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGeographicReportData } from "@/lib/actions/reports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Geographic Insights | Admin",
  description: "View geographic performance analytics",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function GeographicReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await getGeographicReportData();

  const trendIcon = (trend: "growing" | "stable" | "declining") => {
    switch (trend) {
      case "growing":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const trendColor = (trend: "growing" | "stable" | "declining") => {
    switch (trend) {
      case "growing":
        return "bg-green-100 text-green-700";
      case "declining":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <AdminPage
      title="Geographic Insights"
      description="Performance by region and expansion opportunities"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Map className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Regions</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.totalRegions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Top Region</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.topPerformingRegion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Growing</p>
                <p className="text-2xl font-bold">
                  {data.regions.filter((r) => r.trend === "growing").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.underservedRegions.length > 0 ? "bg-amber-50 border-amber-100" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Underserved</p>
                <p className="text-2xl font-bold text-amber-700">
                  {data.underservedRegions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Underserved Regions Alert */}
      {data.underservedRegions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">
                  Underserved Regions Detected
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  The following regions have bookings but no engineers assigned:{" "}
                  <span className="font-medium">
                    {data.underservedRegions.join(", ")}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regional Performance (Last 3 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                    Region
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Bookings
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Engineers
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.regions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No regional data available
                    </td>
                  </tr>
                ) : (
                  data.regions.map((region, i) => {
                    const maxBookings = Math.max(...data.regions.map((r) => r.bookingCount));
                    const percentage = maxBookings > 0 ? (region.bookingCount / maxBookings) * 100 : 0;

                    return (
                      <tr key={region.region} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                i < 3
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {region.region}
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant="secondary">{region.bookingCount}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-600">
                          {formatCurrency(region.revenue)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span
                              className={
                                region.engineerCount === 0 ? "text-red-500 font-medium" : ""
                              }
                            >
                              {region.engineerCount}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge className={trendColor(region.trend)}>
                            <span className="flex items-center gap-1">
                              {trendIcon(region.trend)}
                              {region.trend}
                            </span>
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
