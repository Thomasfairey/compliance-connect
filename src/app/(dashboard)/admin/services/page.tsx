import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServicesClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Services | Admin",
  description: "Manage compliance testing services",
};

export default async function AdminServicesPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const services = await db.service.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  return <ServicesClient services={services} />;
}
