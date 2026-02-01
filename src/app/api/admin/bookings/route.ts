import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.customerId || !data.siteId || !data.serviceId || !data.scheduledDate || !data.slot) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the site belongs to the customer
    const site = await db.site.findFirst({
      where: { id: data.siteId, userId: data.customerId },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site does not belong to customer" },
        { status: 400 }
      );
    }

    // Create the booking
    const booking = await db.booking.create({
      data: {
        customerId: data.customerId,
        siteId: data.siteId,
        serviceId: data.serviceId,
        scheduledDate: new Date(data.scheduledDate),
        slot: data.slot,
        estimatedQty: data.estimatedQty || 1,
        quotedPrice: data.quotedPrice || 0,
        originalPrice: data.quotedPrice || 0,
        engineerId: data.engineerId || null,
        notes: data.notes || null,
        status: data.engineerId ? "CONFIRMED" : "PENDING",
      },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: true,
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const booking = await db.booking.update({
      where: { id: data.id },
      data: {
        ...(data.scheduledDate !== undefined && { scheduledDate: new Date(data.scheduledDate) }),
        ...(data.slot !== undefined && { slot: data.slot }),
        ...(data.engineerId !== undefined && { engineerId: data.engineerId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.quotedPrice !== undefined && { quotedPrice: data.quotedPrice }),
      },
      include: {
        customer: true,
        site: true,
        service: true,
        engineer: true,
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Soft delete by cancelling
    await db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
