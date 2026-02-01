import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format, addHours } from "date-fns";

// iCal feed for engineer jobs
// This allows engineers to subscribe to their job schedule from any calendar app
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Find the engineer profile
  const engineer = await db.user.findUnique({
    where: { id: userId },
    include: {
      engineerProfile: true,
    },
  });

  if (!engineer || !engineer.engineerProfile) {
    return new NextResponse("Engineer not found", { status: 404 });
  }

  // Get all future bookings for this engineer
  const bookings = await db.booking.findMany({
    where: {
      engineerId: userId,
      scheduledDate: { gte: new Date() },
      status: {
        notIn: ["CANCELLED", "DECLINED"],
      },
    },
    include: {
      service: true,
      site: true,
      customer: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Build iCal content
  const icalEvents = bookings.map((booking) => {
    const startDate = booking.scheduledDate;
    const startHour = booking.slot === "AM" ? 9 : 13;
    const eventStart = new Date(startDate);
    eventStart.setHours(startHour, 0, 0, 0);

    const duration = booking.estimatedDuration || 120; // Default 2 hours
    const eventEnd = addHours(eventStart, duration / 60);

    const uid = `${booking.id}@complianceod.co.uk`;
    const summary = `${booking.service.name} - ${booking.customer.name}`;
    const description = [
      `Service: ${booking.service.name}`,
      `Customer: ${booking.customer.name}`,
      booking.customer.phone ? `Phone: ${booking.customer.phone}` : "",
      `Reference: ${booking.reference}`,
      `Status: ${booking.status.replace("_", " ")}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    const location = `${booking.site.name}, ${booking.site.address}, ${booking.site.postcode}`;
    const geo = booking.site.latitude && booking.site.longitude
      ? `GEO:${booking.site.latitude};${booking.site.longitude}`
      : "";

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${formatICalDate(eventStart)}`,
      `DTEND:${formatICalDate(eventEnd)}`,
      `SUMMARY:${escapeICalText(summary)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      `LOCATION:${escapeICalText(location)}`,
      geo,
      `STATUS:${getICalStatus(booking.status)}`,
      `URL:https://www.complianceod.co.uk/engineer/jobs/${booking.id}`,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Compliance Connect//Engineer Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${engineer.name} - Jobs`,
    "X-WR-TIMEZONE:Europe/London",
    // Timezone definition
    "BEGIN:VTIMEZONE",
    "TZID:Europe/London",
    "BEGIN:STANDARD",
    "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0000",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T010000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0100",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    ...icalEvents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobs-${userId}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function getICalStatus(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "CONFIRMED";
    case "CANCELLED":
    case "DECLINED":
      return "CANCELLED";
    default:
      return "CONFIRMED";
  }
}
