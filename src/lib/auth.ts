import { getServerSession } from "next-auth";
import { authOptions } from "./auth-config";
import { db } from "./db";
import type { User, Role } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}

export async function getOrCreateUser(): Promise<User> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
