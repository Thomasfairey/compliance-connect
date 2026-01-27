import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import type { User, Role } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
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
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (!userId || !clerkUser) {
    throw new Error("Unauthorized");
  }

  let user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
        avatarUrl: clerkUser.imageUrl,
      },
    });
  }

  return user;
}

export async function syncUserFromClerk(
  clerkId: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }
): Promise<User> {
  const name = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "User";

  const user = await db.user.upsert({
    where: { clerkId },
    update: {
      email: data.email,
      name,
      avatarUrl: data.imageUrl,
    },
    create: {
      clerkId,
      email: data.email || "",
      name,
      avatarUrl: data.imageUrl,
    },
  });

  return user;
}

export async function deleteUserByClerkId(clerkId: string): Promise<void> {
  await db.user.delete({
    where: { clerkId },
  });
}
