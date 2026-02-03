import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Download, PoundSterling, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRevenueReportData } from "@/lib/actions/reports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Revenue Report | Admin",
  description: "View revenue analytics and trends",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function RevenueReportPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await getRevenueReportData();

  return (
    <AdminPage
      title="Revenue Report"
      description="Monthly and yearly revenue breakdown"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <PoundSterling className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(data.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold">{data.totalBookings}</p>
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
                <p className="text-sm text-gray-500">Avg Job Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data.averageJobValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Top Customers</p>
                <p className="text-2xl font-bold">{data.topCustomers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.byService.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                data.byService.map((service) => {
                  const percentage = Math.round((service.revenue / data.totalRevenue) * 100);
                  return (
                    <div key={service.serviceName}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{service.serviceName}</span>
                        <span className="text-sm text-gray-500">
                          {formatCurrency(service.revenue)} ({service.count} jobs)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.byMonth.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                data.byMonth.map((month) => {
                  const maxRevenue = Math.max(...data.byMonth.map((m) => m.revenue));
                  const percentage = maxRevenue > 0 ? Math.round((month.revenue / maxRevenue) * 100) : 0;
                  return (
                    <div key={month.month} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-20">{month.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                        <div
                          className="bg-blue-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(percentage, 10)}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {formatCurrency(month.revenue)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-16">{month.count} jobs</span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top Customers (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Bookings</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No customer data available
                      </td>
                    </tr>
                  ) : (
                    data.topCustomers.map((customer, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {i + 1}
                            </div>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-500">
                          {customer.companyName || "-"}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant="secondary">{customer.bookings}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-green-600">
                          {formatCurrency(customer.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
