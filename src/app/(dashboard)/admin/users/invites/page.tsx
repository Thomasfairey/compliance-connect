import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Invites | Admin",
  description: "Send and manage user invitations",
};

export default async function UserInvitesPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="User Invitations"
      description="Send invites to new users"
    >
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Invitation Management</p>
          <p className="text-sm mt-2">
            Coming soon: Send email invites, track pending invitations, and manage access codes
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
