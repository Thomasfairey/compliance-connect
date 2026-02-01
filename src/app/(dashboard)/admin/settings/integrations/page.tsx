import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Plug } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrations | Admin",
  description: "Manage third-party integrations",
};

export default async function IntegrationsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Integrations"
      description="Connect third-party services"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Plug className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Third-Party Integrations</p>
          <p className="text-sm mt-2">
            Coming soon: Accounting software, CRM systems, payment gateways, and communication tools
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
