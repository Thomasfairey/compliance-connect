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
  // Use getOrCreateUser to ensure user exists
  try {
    const user = await getOrCreateUser();
    return user;
  } catch {
    throw new Error("Unauthorized");
  }
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

  // First try to find by clerkId
  let user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    // Check if a user with this email already exists (e.g., from seed data)
    const existingUserByEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      // Link the existing user to this Clerk account
      user = await db.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || existingUserByEmail.name,
          avatarUrl: clerkUser.imageUrl || existingUserByEmail.avatarUrl,
        },
      });
    } else {
      // Create a new user
      user = await db.user.create({
        data: {
          clerkId: userId,
          email,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
          avatarUrl: clerkUser.imageUrl,
        },
      });
    }
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
