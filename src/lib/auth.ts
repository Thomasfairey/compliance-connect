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

  const email = clerkUser.emailAddresses[0]?.emailAddress || "";

  console.log("[getOrCreateUser] Looking up user:", { clerkId: userId, email });

  try {
    // First try to find by clerkId
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (user) {
      console.log("[getOrCreateUser] Found user by clerkId:", { id: user.id, email: user.email });
      return user;
    }

    // Check if a user with this email already exists (e.g., from seed data or previous Clerk account)
    const existingUserByEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      // If user exists with different clerkId, update it to use the new Clerk account
      // This handles cases where Clerk was reset or user was migrated
      console.log("[getOrCreateUser] Found user by email, updating clerkId:", {
        id: existingUserByEmail.id,
        oldClerkId: existingUserByEmail.clerkId,
        newClerkId: userId,
      });
      user = await db.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || existingUserByEmail.name,
          avatarUrl: clerkUser.imageUrl || existingUserByEmail.avatarUrl,
        },
      });
      return user;
    }

    // Create a new user
    console.log("[getOrCreateUser] Creating new user:", { clerkId: userId, email });
    user = await db.user.create({
      data: {
        clerkId: userId,
        email,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
        avatarUrl: clerkUser.imageUrl,
      },
    });

    console.log("[getOrCreateUser] Created new user:", { id: user.id });
    return user;
  } catch (error) {
    // Log the actual error for debugging
    console.error("getOrCreateUser error:", {
      clerkUserId: userId,
      email,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(`Failed to get or create user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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
