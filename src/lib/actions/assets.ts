"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { assetSchema } from "@/lib/validations";
import type { Asset } from "@prisma/client";
import type { CreateAssetInput } from "@/types";

export async function getBookingAssets(bookingId: string): Promise<Asset[]> {
  const assets = await db.asset.findMany({
    where: { bookingId },
    orderBy: { testedAt: "asc" },
  });

  return assets;
}

export async function createAsset(
  bookingId: string,
  input: CreateAssetInput
): Promise<{ success: boolean; data?: Asset; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);
    const validated = assetSchema.parse(input);

    // Verify booking belongs to engineer
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ engineerId: user.id }, { customer: { role: "ADMIN" } }],
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be in progress to add assets" };
    }

    const asset = await db.asset.create({
      data: {
        bookingId,
        ...validated,
        imageUrl: validated.imageUrl || null,
      },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);

    return { success: true, data: asset };
  } catch (error) {
    console.error("Error creating asset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create asset",
    };
  }
}

export async function updateAsset(
  assetId: string,
  input: Partial<CreateAssetInput>
): Promise<{ success: boolean; data?: Asset; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const asset = await db.asset.findUnique({
      where: { id: assetId },
      include: { booking: true },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    if (asset.booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const updatedAsset = await db.asset.update({
      where: { id: assetId },
      data: input,
    });

    revalidatePath(`/engineer/jobs/${asset.bookingId}`);

    return { success: true, data: updatedAsset };
  } catch (error) {
    console.error("Error updating asset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update asset",
    };
  }
}

export async function deleteAsset(
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const asset = await db.asset.findUnique({
      where: { id: assetId },
      include: { booking: true },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    if (asset.booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await db.asset.delete({
      where: { id: assetId },
    });

    revalidatePath(`/engineer/jobs/${asset.bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting asset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete asset",
    };
  }
}

export async function bulkCreateAssets(
  bookingId: string,
  assets: CreateAssetInput[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const user = await requireRole(["ENGINEER", "ADMIN"]);

    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ engineerId: user.id }, { customer: { role: "ADMIN" } }],
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status !== "IN_PROGRESS") {
      return { success: false, error: "Job must be in progress to add assets" };
    }

    const validatedAssets = assets.map((asset) => ({
      ...assetSchema.parse(asset),
      bookingId,
      imageUrl: asset.imageUrl || null,
    }));

    const result = await db.asset.createMany({
      data: validatedAssets,
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error bulk creating assets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create assets",
    };
  }
}
