import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { NewBookingForm } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Booking | Admin",
  description: "Create a new booking for a customer",
};

export default async function NewBookingPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch data for the form
  const [customers, services, engineers] = await Promise.all([
    db.user.findMany({
      where: { role: "CUSTOMER" },
      include: {
        sites: {
          select: { id: true, name: true, postcode: true, address: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: {
        role: "ENGINEER",
        engineerProfile: { status: "APPROVED" },
      },
      include: {
        engineerProfile: {
          include: { competencies: true, coverageAreas: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminPage
      title="Create Booking"
      description="Create a new booking for a customer"
    >
      <NewBookingForm
        customers={customers}
        services={services}
        engineers={engineers}
      />
    </AdminPage>
  );
}
