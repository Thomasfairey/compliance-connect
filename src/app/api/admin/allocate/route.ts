import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { autoAllocateBooking } from "@/lib/actions/allocation";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser();

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const result = await autoAllocateBooking(bookingId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error allocating booking:", error);
    return NextResponse.json(
      { success: false, error: "Allocation failed" },
      { status: 500 }
    );
  }
}
