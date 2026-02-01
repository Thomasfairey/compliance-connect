import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsersClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users & Access | Admin",
  description: "Manage user accounts and permissions",
};

export default async function UsersPage() {
  const currentUser = await getOrCreateUser();

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      engineerProfile: true,
    },
  });

  const formattedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: (user.engineerProfile?.status === "SUSPENDED"
      ? "suspended"
      : user.engineerProfile?.status === "PENDING_APPROVAL"
      ? "pending"
      : "active") as "active" | "pending" | "suspended",
    lastActive: user.updatedAt,
    createdAt: user.createdAt,
    hasEngineerProfile: !!user.engineerProfile,
  }));

  return <UsersClient users={formattedUsers} currentUserId={currentUser.id} />;
}
