import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { autoAllocateBookingV2 } from "@/lib/scheduling/v2";

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

    const result = await autoAllocateBookingV2(bookingId);

    return NextResponse.json({
      success: result.success,
      engineerId: result.selected?.engineer.user.id,
      engineerName: result.selected?.engineer.user.name,
      score: result.selected?.score.compositeScore,
      error: result.error,
    });
  } catch (error) {
    console.error("Error allocating booking:", error);
    return NextResponse.json(
      { success: false, error: "Allocation failed" },
      { status: 500 }
    );
  }
}
