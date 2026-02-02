import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookingAnalyticsData } from "@/lib/actions/reports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking Analytics | Admin",
  description: "View booking trends and analytics",
};

export default async function BookingReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await getBookingAnalyticsData();

  return (
    <AdminPage
      title="Booking Analytics"
      description="Booking trends and completion analysis"
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
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.totalBookings}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.completionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cancellation Rate</p>
                <p className="text-2xl font-bold">{data.cancellationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">
                  {data.totalBookings - data.completedCount - data.cancelledCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Booking Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Booking Trends (Last 3 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.trends.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trend data available</p>
            ) : (
              <div className="space-y-2">
                {data.trends.map((week) => {
                  const total = week.completed + week.cancelled + week.pending;
                  const completedWidth = total > 0 ? (week.completed / total) * 100 : 0;
                  const cancelledWidth = total > 0 ? (week.cancelled / total) * 100 : 0;
                  const pendingWidth = total > 0 ? (week.pending / total) * 100 : 0;

                  return (
                    <div key={week.date} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-20 flex-shrink-0">
                        {week.date}
                      </span>
                      <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-gray-100">
                        {completedWidth > 0 && (
                          <div
                            className="bg-green-500 flex items-center justify-center"
                            style={{ width: `${completedWidth}%` }}
                          >
                            {week.completed > 2 && (
                              <span className="text-xs text-white font-medium">
                                {week.completed}
                              </span>
                            )}
                          </div>
                        )}
                        {cancelledWidth > 0 && (
                          <div
                            className="bg-red-400 flex items-center justify-center"
                            style={{ width: `${cancelledWidth}%` }}
                          >
                            {week.cancelled > 2 && (
                              <span className="text-xs text-white font-medium">
                                {week.cancelled}
                              </span>
                            )}
                          </div>
                        )}
                        {pendingWidth > 0 && (
                          <div
                            className="bg-amber-400 flex items-center justify-center"
                            style={{ width: `${pendingWidth}%` }}
                          >
                            {week.pending > 2 && (
                              <span className="text-xs text-white font-medium">
                                {week.pending}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {total}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-4 border-t mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-sm text-gray-500">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded" />
                    <span className="text-sm text-gray-500">Cancelled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-400 rounded" />
                    <span className="text-sm text-gray-500">Pending</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Peak Booking Times</CardTitle>
          </CardHeader>
          <CardContent>
            {data.peakHours.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-3">
                {data.peakHours.map((hour, i) => {
                  const maxCount = Math.max(...data.peakHours.map((h) => h.count));
                  const percentage = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                  return (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-16">{hour.hour}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            i === 0 ? "bg-blue-500" : "bg-blue-300"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <Badge variant={i === 0 ? "default" : "secondary"}>
                        {hour.count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {data.peakDays.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-3">
                {data.peakDays.map((day, i) => {
                  const maxCount = Math.max(...data.peakDays.map((d) => d.count));
                  const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">{day.day}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            i === 0 ? "bg-purple-500" : "bg-purple-300"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <Badge variant={i === 0 ? "default" : "secondary"}>
                        {day.count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
