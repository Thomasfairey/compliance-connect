import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { buildOptimizedRoute } from "@/lib/scheduling/v2/travel";
import { SystemHealthStatus } from "@/components/admin/optimization-client";
import {
  Route,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Health | Admin",
  description: "Scheduling performance and allocation metrics",
};

export default async function SystemHealthPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();
  const tomorrow = addDays(now, 1);

  // Get tomorrow's bookings grouped by engineer
  const tomorrowBookings = await db.booking.findMany({
    where: {
      scheduledDate: {
        gte: startOfDay(tomorrow),
        lte: endOfDay(tomorrow),
      },
      status: { in: ["PENDING", "CONFIRMED"] },
      engineerId: { not: null },
    },
    include: {
      engineer: true,
      site: true,
      service: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Group by engineer
  const engineerRoutes = new Map<string, typeof tomorrowBookings>();
  tomorrowBookings.forEach((booking) => {
    if (!booking.engineerId) return;
    const existing = engineerRoutes.get(booking.engineerId) || [];
    existing.push(booking);
    engineerRoutes.set(booking.engineerId, existing);
  });

  // Build optimized routes for each engineer
  const routeData = await Promise.all(
    Array.from(engineerRoutes.entries()).map(async ([engineerId, bookings]) => {
      const optimizedRoute = await buildOptimizedRoute(engineerId, tomorrow);
      return {
        engineer: bookings[0].engineer!,
        bookings,
        optimizedRoute,
        estimatedKm: optimizedRoute?.totalKm ?? bookings.length * 10,
        estimatedMinutes: optimizedRoute?.totalTravelMinutes ?? bookings.length * 30,
        efficiencyRating: optimizedRoute?.efficiencyRating ?? 70,
      };
    })
  );

  return (
    <AdminPage
      title="System Health"
      description="Scheduling performance and route efficiency"
      actions={<SystemHealthStatus />}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tomorrowBookings.length}</div>
            <div className="text-sm text-gray-500">Jobs Tomorrow</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{routeData.length}</div>
            <div className="text-sm text-gray-500">Engineers Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {routeData.reduce((sum, r) => sum + r.estimatedKm, 0)} km
            </div>
            <div className="text-sm text-gray-500">Est. Total Travel</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {routeData.length > 0
                ? Math.round(
                    routeData.reduce((sum, r) => sum + r.efficiencyRating, 0) /
                      routeData.length
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-500">Efficiency Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Tomorrow's Routes */}
      <h2 className="text-lg font-semibold mb-4">
        Tomorrow&apos;s Routes - {format(tomorrow, "EEEE, MMMM d")}
      </h2>

      {routeData.length > 0 ? (
        <div className="space-y-4">
          {routeData.map((route) => (
            <Card key={route.engineer.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                      {route.engineer.name?.charAt(0) || "E"}
                    </div>
                    <div>
                      <CardTitle className="text-base">{route.engineer.name}</CardTitle>
                      <CardDescription>
                        {route.bookings.length} jobs • Est. {route.estimatedKm} km travel
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      route.efficiencyRating >= 80
                        ? "bg-green-50 text-green-700 border-0"
                        : route.efficiencyRating >= 50
                        ? "bg-yellow-50 text-yellow-700 border-0"
                        : "bg-red-50 text-red-700 border-0"
                    }
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {route.efficiencyRating >= 80
                      ? "Optimized"
                      : route.efficiencyRating >= 50
                      ? "Moderate"
                      : "Needs Attention"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {route.bookings.map((booking, idx) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{booking.service.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {booking.site.postcode}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.slot}
                          </span>
                        </div>
                      </div>
                      {idx < route.bookings.length - 1 && route.optimizedRoute?.stops[idx + 1] && (
                        <div className="text-xs text-gray-400">
                          ~{route.optimizedRoute.stops[idx + 1].travelFromPrevious} min ({route.optimizedRoute.stops[idx + 1].distanceFromPrevious} km)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Routes for Tomorrow</h3>
            <p className="text-gray-500 mt-2">
              There are no confirmed bookings with assigned engineers for tomorrow.
            </p>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          System Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800">
          <div>
            <div className="text-green-600 font-medium">Allocator</div>
            <div>V2 Multi-Objective (13 factors)</div>
          </div>
          <div>
            <div className="text-green-600 font-medium">Auto-Allocation</div>
            <div>Active on booking creation</div>
          </div>
          <div>
            <div className="text-green-600 font-medium">Pricing Engine</div>
            <div>Dynamic (5 rule types)</div>
          </div>
          <div>
            <div className="text-green-600 font-medium">Route Optimization</div>
            <div>Continuous</div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
