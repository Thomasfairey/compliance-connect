"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { siteSchema } from "@/lib/validations";
import type { Site } from "@prisma/client";
import type { CreateSiteInput } from "@/types";

export async function getUserSites(): Promise<Site[]> {
  const user = await requireUser();

  const sites = await db.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return sites;
}

export async function getSiteById(id: string): Promise<Site | null> {
  const user = await requireUser();

  const site = await db.site.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  return site;
}

export async function createSite(
  input: CreateSiteInput
): Promise<{ success: boolean; data?: Site; error?: string }> {
  try {
    const user = await requireUser();
    const validated = siteSchema.parse(input);

    const site = await db.site.create({
      data: {
        ...validated,
        userId: user.id,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/sites");

    return { success: true, data: site };
  } catch (error) {
    console.error("Error creating site:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create site",
    };
  }
}

export async function updateSite(
  id: string,
  input: CreateSiteInput
): Promise<{ success: boolean; data?: Site; error?: string }> {
  try {
    const user = await requireUser();
    const validated = siteSchema.parse(input);

    const existingSite = await db.site.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingSite) {
      return { success: false, error: "Site not found" };
    }

    const site = await db.site.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/dashboard");
    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);

    return { success: true, data: site };
  } catch (error) {
    console.error("Error updating site:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update site",
    };
  }
}

export async function deleteSite(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const existingSite = await db.site.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingSite) {
      return { success: false, error: "Site not found" };
    }

    await db.site.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/sites");

    return { success: true };
  } catch (error) {
    console.error("Error deleting site:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete site",
    };
  }
}
