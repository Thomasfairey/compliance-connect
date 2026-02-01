"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { uploadFile, BUCKETS } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  createCompletionCertificate,
  type CertificateData,
} from "@/lib/certificates/completion-certificate";

type GenerateCertificateResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Generate a completion certificate for a booking
 */
export async function generateCompletionCertificate(
  bookingId: string
): Promise<GenerateCertificateResult> {
  try {
    const user = await requireUser();

    // Fetch booking with all related data
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: {
          include: {
            engineerProfile: {
              include: {
                qualifications: true,
              },
            },
          },
        },
        assets: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Verify access
    const isAuthorized =
      user.role === "ADMIN" ||
      user.id === booking.engineerId ||
      user.id === booking.customerId;

    if (!isAuthorized) {
      return { success: false, error: "Not authorized" };
    }

    // Only generate for completed bookings
    if (booking.status !== "COMPLETED") {
      return { success: false, error: "Booking must be completed to generate certificate" };
    }

    // Prepare certificate data
    const passedAssets = booking.assets.filter((a) => a.status === "PASS").length;
    const failedAssets = booking.assets.filter((a) => a.status === "FAIL").length;

    const completedDate = booking.completedAt || new Date();

    const certificateData: CertificateData = {
      reference: booking.reference,
      serviceName: booking.service.name,
      completedDate: completedDate.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      completedTime: completedDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      siteName: booking.site.name,
      siteAddress: booking.site.address,
      sitePostcode: booking.site.postcode,
      customerName: booking.customer.name,
      companyName: booking.customer.companyName || undefined,
      engineerName: booking.engineer?.name || "N/A",
      engineerQualifications: booking.engineer?.engineerProfile?.qualifications
        ?.filter((q) => q.verified)
        .map((q) => q.name) || [],
      totalItems: booking.assets.length,
      passedItems: passedAssets,
      failedItems: failedAssets,
      signedBy: booking.customerSignedBy || undefined,
      signatureUrl: booking.customerSignatureUrl || undefined,
      signedAt: booking.customerSignedAt
        ? booking.customerSignedAt.toLocaleString("en-GB")
        : undefined,
      engineerNotes: booking.engineerNotes || undefined,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      createCompletionCertificate(certificateData)
    );

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const fileName = `${booking.reference}-certificate-${timestamp}.pdf`;
    const path = `${bookingId}/${fileName}`;

    // Convert buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(pdfBuffer);
    const uploadResult = await uploadFile(BUCKETS.CERTIFICATES, path, new Blob([uint8Array]), {
      contentType: "application/pdf",
    });

    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error || "Failed to upload certificate" };
    }

    // Update booking with certificate URL
    await db.booking.update({
      where: { id: bookingId },
      data: { certificateUrl: uploadResult.url },
    });

    revalidatePath(`/engineer/jobs/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);

    return { success: true, url: uploadResult.url };
  } catch (error) {
    console.error("Generate certificate error:", error);
    return { success: false, error: "Failed to generate certificate" };
  }
}

/**
 * Get certificate URL for a booking
 */
export async function getCertificateUrl(bookingId: string): Promise<string | null> {
  try {
    const user = await requireUser();

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        certificateUrl: true,
        customerId: true,
        engineerId: true,
      },
    });

    if (!booking) return null;

    // Verify access
    const hasAccess =
      user.role === "ADMIN" ||
      user.id === booking.customerId ||
      user.id === booking.engineerId;

    if (!hasAccess) return null;

    return booking.certificateUrl;
  } catch (error) {
    console.error("Get certificate URL error:", error);
    return null;
  }
}

/**
 * Regenerate certificate (e.g., after corrections)
 */
export async function regenerateCertificate(
  bookingId: string
): Promise<GenerateCertificateResult> {
  try {
    const user = await requireUser();

    // Only admins and the assigned engineer can regenerate
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { engineerId: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (user.role !== "ADMIN" && user.id !== booking.engineerId) {
      return { success: false, error: "Not authorized to regenerate certificate" };
    }

    // Generate new certificate
    return generateCompletionCertificate(bookingId);
  } catch (error) {
    console.error("Regenerate certificate error:", error);
    return { success: false, error: "Failed to regenerate certificate" };
  }
}
