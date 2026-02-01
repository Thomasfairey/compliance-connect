"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { uploadFile, BUCKETS } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type EvidenceType = "PHOTO" | "SIGNATURE" | "DOCUMENT" | "TEST_RESULT";

export type JobEvidenceRecord = {
  id: string;
  bookingId: string;
  assetId?: string;
  type: EvidenceType;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  description?: string;
  uploadedAt: Date;
  uploadedBy: string;
};

/**
 * Upload evidence photo for a job
 */
export async function uploadJobEvidence(
  formData: FormData
): Promise<{ success: boolean; evidence?: JobEvidenceRecord; error?: string }> {
  try {
    const user = await requireUser();

    const file = formData.get("file") as File;
    const bookingId = formData.get("bookingId") as string;
    const assetId = formData.get("assetId") as string | null;
    const type = (formData.get("type") as EvidenceType) || "PHOTO";
    const description = formData.get("description") as string | null;

    if (!file || !bookingId) {
      return { success: false, error: "File and booking ID required" };
    }

    // Verify booking exists and user has access
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, engineerId: true, status: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized to upload for this job" };
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return { success: false, error: "Cannot upload to completed or cancelled job" };
    }

    // Generate unique path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = assetId
      ? `${bookingId}/assets/${assetId}/${timestamp}-${sanitizedName}`
      : `${bookingId}/general/${timestamp}-${sanitizedName}`;

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(BUCKETS.JOB_EVIDENCE, path, file, {
      contentType: file.type,
    });

    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error || "Upload failed" };
    }

    // Store reference in database
    const evidence = await db.jobEvidence.create({
      data: {
        bookingId,
        assetId: assetId || null,
        type,
        fileUrl: uploadResult.url,
        fileName: file.name,
        mimeType: file.type,
        description: description || null,
        uploadedBy: user.id,
      },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);

    return {
      success: true,
      evidence: {
        id: evidence.id,
        bookingId: evidence.bookingId,
        assetId: evidence.assetId || undefined,
        type: evidence.type as EvidenceType,
        fileUrl: evidence.fileUrl,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        description: evidence.description || undefined,
        uploadedAt: evidence.uploadedAt,
        uploadedBy: evidence.uploadedBy,
      },
    };
  } catch (error) {
    console.error("Upload job evidence error:", error);
    return { success: false, error: "Upload failed" };
  }
}

/**
 * Upload customer signature for job completion
 */
export async function uploadSignature(
  bookingId: string,
  signatureDataUrl: string,
  signeeName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const user = await requireUser();

    // Verify booking
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, engineerId: true, status: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.engineerId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized" };
    }

    // Convert data URL to Blob
    const base64Data = signatureDataUrl.split(",")[1];
    const binaryData = Buffer.from(base64Data, "base64");
    const blob = new Blob([binaryData], { type: "image/png" });

    // Upload to Supabase
    const timestamp = Date.now();
    const path = `${bookingId}/${timestamp}-signature.png`;

    const uploadResult = await uploadFile(BUCKETS.SIGNATURES, path, blob, {
      contentType: "image/png",
    });

    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error };
    }

    // Store in job evidence
    await db.jobEvidence.create({
      data: {
        bookingId,
        type: "SIGNATURE",
        fileUrl: uploadResult.url,
        fileName: `signature-${signeeName}.png`,
        mimeType: "image/png",
        description: `Customer signature: ${signeeName}`,
        uploadedBy: user.id,
      },
    });

    // Update booking with signature info
    await db.booking.update({
      where: { id: bookingId },
      data: {
        customerSignatureUrl: uploadResult.url,
        customerSignedBy: signeeName,
        customerSignedAt: new Date(),
      },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);

    return { success: true, url: uploadResult.url };
  } catch (error) {
    console.error("Upload signature error:", error);
    return { success: false, error: "Signature upload failed" };
  }
}

/**
 * Get all evidence for a job
 */
export async function getJobEvidence(
  bookingId: string
): Promise<JobEvidenceRecord[]> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, engineerId: true },
    });

    if (!booking) return [];

    // Check access
    const hasAccess =
      user.role === "ADMIN" ||
      user.id === booking.customerId ||
      user.id === booking.engineerId;

    if (!hasAccess) return [];

    const evidence = await db.jobEvidence.findMany({
      where: { bookingId },
      orderBy: { uploadedAt: "desc" },
    });

    return evidence.map((e) => ({
      id: e.id,
      bookingId: e.bookingId,
      assetId: e.assetId || undefined,
      type: e.type as EvidenceType,
      fileUrl: e.fileUrl,
      fileName: e.fileName,
      mimeType: e.mimeType,
      description: e.description || undefined,
      uploadedAt: e.uploadedAt,
      uploadedBy: e.uploadedBy,
    }));
  } catch (error) {
    console.error("Get job evidence error:", error);
    return [];
  }
}

/**
 * Delete evidence (admin or uploader only)
 */
export async function deleteJobEvidence(
  evidenceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();

    const evidence = await db.jobEvidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      return { success: false, error: "Evidence not found" };
    }

    if (evidence.uploadedBy !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized to delete" };
    }

    await db.jobEvidence.delete({
      where: { id: evidenceId },
    });

    revalidatePath(`/engineer/jobs/${evidence.bookingId}`);

    return { success: true };
  } catch (error) {
    console.error("Delete evidence error:", error);
    return { success: false, error: "Delete failed" };
  }
}
