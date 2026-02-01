import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Palette } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Branding | Admin",
  description: "Customize platform branding",
};

export default async function BrandingPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Branding"
      description="Customize your platform appearance"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Palette className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Brand Customization</p>
          <p className="text-sm mt-2">
            Coming soon: Logo upload, color schemes, email templates, and certificate branding
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
