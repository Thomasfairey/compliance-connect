import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

const statusTransitions: Record<string, { next: string; allowed: string[] }> = {
  ACCEPT: { next: "CONFIRMED", allowed: ["PENDING"] },
  START_TRAVEL: { next: "EN_ROUTE", allowed: ["CONFIRMED"] },
  ARRIVE: { next: "ON_SITE", allowed: ["EN_ROUTE"] },
  START_WORK: { next: "IN_PROGRESS", allowed: ["ON_SITE"] },
  COMPLETE: { next: "COMPLETED", allowed: ["IN_PROGRESS"] },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    const { id } = await params;

    if (user.role !== "ENGINEER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await request.json();

    if (!action || !statusTransitions[action]) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const booking = await db.booking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if this engineer can perform this action
    if (action === "ACCEPT") {
      // Anyone can accept an unassigned booking
      if (booking.engineerId && booking.engineerId !== user.id) {
        return NextResponse.json(
          { error: "Booking already assigned to another engineer" },
          { status: 400 }
        );
      }
    } else {
      // Other actions require assignment
      if (booking.engineerId !== user.id && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Not authorized for this booking" },
          { status: 403 }
        );
      }
    }

    const transition = statusTransitions[action];
    if (!transition.allowed.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} from status ${booking.status}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: transition.next,
    };

    // Add timestamps for specific transitions
    switch (action) {
      case "ACCEPT":
        updateData.engineerId = user.id;
        updateData.acceptedAt = new Date();
        break;
      case "START_TRAVEL":
        updateData.enRouteAt = new Date();
        break;
      case "ARRIVE":
        updateData.arrivedAt = new Date();
        break;
      case "START_WORK":
        updateData.startedAt = new Date();
        break;
      case "COMPLETE":
        updateData.completedAt = new Date();
        break;
    }

    const updated = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        service: true,
        site: true,
        customer: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: `Job ${action.toLowerCase().replace("_", " ")}`,
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    return NextResponse.json(
      { error: "Failed to update job status" },
      { status: 500 }
    );
  }
}
