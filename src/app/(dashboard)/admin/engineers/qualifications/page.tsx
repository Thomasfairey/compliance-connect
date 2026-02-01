import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Engineer Qualifications | Admin",
  description: "Manage engineer certifications and qualifications",
};

export default async function EngineerQualificationsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Engineer Qualifications"
      description="Track certifications and training"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Qualification Management</p>
          <p className="text-sm mt-2">
            Coming soon: Certificate tracking, expiry alerts, training records, and compliance verification
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
