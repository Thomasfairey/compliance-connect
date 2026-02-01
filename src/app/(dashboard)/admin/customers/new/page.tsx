import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Customer | Admin",
  description: "Add a new customer to the platform",
};

export default async function NewCustomerPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Add New Customer"
      description="Create a new customer account"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Customer Registration</p>
          <p className="text-sm mt-2 mb-6">
            Customers self-register through the customer portal.
            You can also create a booking on their behalf which will create their account.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/admin/customers">View Customers</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/bookings/new">Create Booking</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
