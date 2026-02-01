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

    const service = await db.service.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        basePrice: data.basePrice || 0,
        minCharge: data.minCharge || 0,
        unitName: data.unitName || "unit",
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
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
      return NextResponse.json({ error: "Service ID required" }, { status: 400 });
    }

    const service = await db.service.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.minCharge !== undefined && { minCharge: data.minCharge }),
        ...(data.unitName !== undefined && { unitName: data.unitName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
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
      return NextResponse.json({ error: "Service ID required" }, { status: 400 });
    }

    // Check for existing bookings
    const bookingCount = await db.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete service with existing bookings" },
        { status: 400 }
      );
    }

    await db.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
