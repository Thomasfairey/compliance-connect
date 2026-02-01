import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Engineer | Admin",
  description: "Add a new engineer to the platform",
};

export default async function NewEngineerPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Add New Engineer"
      description="Invite an engineer to join the platform"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Engineer Onboarding</p>
          <p className="text-sm mt-2 mb-6">
            Engineers self-register through the engineer portal and complete their profile.
            You can then approve them from the engineers list.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/admin/engineers">View Engineers</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users/invites">Send Invite</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
