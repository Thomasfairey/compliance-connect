import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Key, Edit2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roles & Permissions | Admin",
  description: "Configure access levels and permissions",
};

const roles = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all system features and settings",
    userCount: 2,
    isSystem: true,
    permissions: [
      "Dashboard access",
      "Booking management",
      "Engineer management",
      "Customer management",
      "Scheduling control",
      "Settings management",
      "User management",
      "Reports & Analytics",
    ],
  },
  {
    id: "engineer",
    name: "Engineer",
    description: "Access to own jobs and availability management",
    userCount: 8,
    isSystem: true,
    permissions: [
      "View own jobs",
      "Update job status",
      "Manage availability",
      "View own earnings",
      "Upload certificates",
    ],
  },
  {
    id: "customer",
    name: "Customer",
    description: "Book services and manage own sites",
    userCount: 25,
    isSystem: true,
    permissions: [
      "Book services",
      "View own bookings",
      "Manage sites",
      "View compliance status",
      "Download certificates",
    ],
  },
];

export default async function RolesPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Roles & Permissions"
      description="Configure access levels and permissions for different user types"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{role.name}</CardTitle>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {role.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {role.userCount} users
                </span>
                <span className="flex items-center gap-1">
                  <Key className="w-4 h-4" />
                  {role.permissions.length} permissions
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 5).map((perm) => (
                  <Badge
                    key={perm}
                    variant="secondary"
                    className="text-xs bg-blue-50 text-blue-700"
                  >
                    {perm}
                  </Badge>
                ))}
                {role.permissions.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{role.permissions.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-gray-50 border rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">About Roles</h3>
        <p className="text-sm text-gray-600">
          System roles (Admin, Engineer, Customer) cannot be deleted but their
          permissions can be modified. Custom roles can be created for more
          granular access control, such as &quot;Operations Manager&quot; or
          &quot;Regional Admin&quot;.
        </p>
      </div>
    </AdminPage>
  );
}
