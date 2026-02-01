import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  PoundSterling,
  Wrench,
  Map,
  Calendar,
  Bell,
  Plug,
  Palette,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | Admin",
  description: "Configure your Compliance Connect platform",
};

const settingsSections = [
  {
    id: "pricing",
    title: "Pricing",
    description: "Service prices, discounts, and payment settings",
    icon: PoundSterling,
    href: "/admin/settings/pricing",
  },
  {
    id: "services",
    title: "Services",
    description: "Manage service types and requirements",
    icon: Wrench,
    href: "/admin/services",
  },
  {
    id: "regions",
    title: "Regions & Zones",
    description: "Geographic coverage and zone configuration",
    icon: Map,
    href: "/admin/settings/regions",
  },
  {
    id: "scheduling",
    title: "Scheduling Rules",
    description: "Allocation weights, capacity, and optimization",
    icon: Calendar,
    href: "/admin/scheduling/control",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email, SMS, and push notification settings",
    icon: Bell,
    href: "/admin/settings/notifications",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Connect with external services",
    icon: Plug,
    href: "/admin/settings/integrations",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Logo, colors, and white-label settings",
    icon: Palette,
    href: "/admin/settings/branding",
  },
  {
    id: "system",
    title: "System",
    description: "Advanced configuration and maintenance",
    icon: Settings,
    href: "/admin/settings/system",
  },
];

export default async function SettingsHubPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Settings"
      description="Configure your Compliance Connect platform"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {settingsSections.map((section) => (
          <Link key={section.id} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <section.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
