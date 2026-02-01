import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, MapPin, Calendar, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers | Admin",
  description: "Manage customer accounts",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function CustomersPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      sites: true,
      bookings: {
        where: { status: "COMPLETED" },
      },
      customerMetrics: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: customers.length,
    withMetrics: customers.filter((c) => c.customerMetrics).length,
    totalRevenue: customers.reduce(
      (sum, c) => sum + (c.customerMetrics?.totalRevenue ?? 0),
      0
    ),
    totalSites: customers.reduce((sum, c) => sum + c.sites.length, 0),
  };

  return (
    <AdminPage
      title="Customers"
      description="Manage customer accounts and view their activity"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalSites}</div>
            <div className="text-sm text-gray-500">Total Sites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-sm text-gray-500">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue / (stats.total || 1))}
            </div>
            <div className="text-sm text-gray-500">Avg. Revenue/Customer</div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Sites</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead>LTV Score</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                        {customer.name?.charAt(0) ||
                          customer.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.name || "Unnamed"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.companyName || customer.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.sites.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{customer.bookings.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(customer.customerMetrics?.totalRevenue ?? 0)}
                  </TableCell>
                  <TableCell>
                    {customer.customerMetrics ? (
                      <LTVBadge score={customer.customerMetrics.ltvScore} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(customer.updatedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPage>
  );
}

function LTVBadge({ score }: { score: number }) {
  let color = "bg-gray-100 text-gray-700";
  let label = "Low";

  if (score >= 80) {
    color = "bg-green-100 text-green-700";
    label = "High";
  } else if (score >= 50) {
    color = "bg-blue-100 text-blue-700";
    label = "Medium";
  }

  return (
    <Badge variant="outline" className={`border-0 ${color}`}>
      {label} ({score})
    </Badge>
  );
}
