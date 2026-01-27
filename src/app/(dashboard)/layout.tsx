import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Redirect based on role
  // Engineers should go to /engineer
  // Admins should go to /admin
  // This is handled by each page, not the layout

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      {children}
    </DashboardLayout>
  );
}
