import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Download,
  Star,
  Briefcase,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEngineerReportData } from "@/lib/actions/reports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Report | Admin",
  description: "View engineer performance analytics",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function EngineerReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await getEngineerReportData();

  return (
    <AdminPage
      title="Engineer Performance Report"
      description="Individual engineer metrics and ratings"
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
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Engineers</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.totalEngineers}
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
                <p className="text-sm text-gray-500">Active (3mo)</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.activeEngineers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Jobs Completed</p>
                <p className="text-2xl font-bold">{data.totalJobsCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Jobs/Engineer</p>
                <p className="text-2xl font-bold">{data.averageJobsPerEngineer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engineers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Engineer Performance (Last 3 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                    Engineer
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Jobs
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Rating
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Utilization
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                    Completion
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.engineers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No engineer data available
                    </td>
                  </tr>
                ) : (
                  data.engineers.map((eng, i) => (
                    <tr key={eng.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              i < 3
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {i + 1}
                          </div>
                          <span className="font-medium">{eng.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant="secondary">{eng.jobsCompleted}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-green-600">
                        {formatCurrency(eng.totalRevenue)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {eng.averageRating ? (
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span className="font-medium">
                              {eng.averageRating.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                eng.utilizationPercent >= 80
                                  ? "bg-green-500"
                                  : eng.utilizationPercent >= 50
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                              }`}
                              style={{ width: `${eng.utilizationPercent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-10">
                            {eng.utilizationPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge
                          variant={eng.completionRate >= 90 ? "default" : "secondary"}
                          className={
                            eng.completionRate >= 90
                              ? "bg-green-100 text-green-700"
                              : ""
                          }
                        >
                          {eng.completionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
