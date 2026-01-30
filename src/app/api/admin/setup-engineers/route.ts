import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Verify admin
    const user = await getOrCreateUser();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all services
    const services = await db.service.findMany({
      where: { isActive: true },
    });

    // UK postcode prefixes for broad coverage
    const ukPostcodes = [
      "E", "EC", "N", "NW", "SE", "SW", "W", "WC",
      "B", "M", "L", "G", "EH", "CF", "BS", "LE", "NG", "S",
      "NE", "SR", "DH", "TS", "DL", "HG", "YO", "LS", "BD", "HX",
      "WF", "HD", "DN", "HU", "LN", "PE", "CB", "IP", "NR", "CO",
      "CM", "SS", "RM", "IG", "DA", "BR", "CR", "SM", "KT", "TW",
      "UB", "HA", "EN", "WD", "AL", "SG", "HP", "LU", "MK", "NN",
      "CV", "WS", "WV", "DY", "ST", "DE", "SK", "CW", "WA",
      "CH", "PR", "BL", "OL", "BB", "FY", "LA", "CA", "DG", "TD",
      "ML", "KA", "PA", "FK", "KY", "DD", "PH", "AB", "IV", "KW",
      "BT", "SA", "LD", "SY", "LL",
      "OX", "RG", "SL", "GU", "PO", "SO", "SP", "BA", "SN", "GL",
      "HR", "WR", "TF", "BN", "RH", "TN", "CT", "ME", "EX", "PL",
      "TQ", "TR", "DT", "TA", "JE", "GY", "IM",
    ];

    // Get all engineers
    const engineers = await db.user.findMany({
      where: { role: "ENGINEER" },
    });

    let setupCount = 0;

    for (const engineer of engineers) {
      // Get or create engineer profile
      let profile = await db.engineerProfile.findUnique({
        where: { userId: engineer.id },
      });

      if (!profile) {
        profile = await db.engineerProfile.create({
          data: {
            userId: engineer.id,
            status: "APPROVED",
            approvedAt: new Date(),
            yearsExperience: 5,
            bio: "Experienced compliance testing engineer",
          },
        });
      } else {
        await db.engineerProfile.update({
          where: { id: profile.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });
      }

      // Add competencies for all services
      for (const service of services) {
        await db.engineerCompetency.upsert({
          where: {
            engineerProfileId_serviceId: {
              engineerProfileId: profile.id,
              serviceId: service.id,
            },
          },
          update: { certified: true, experienceYears: 5 },
          create: {
            engineerProfileId: profile.id,
            serviceId: service.id,
            certified: true,
            experienceYears: 5,
          },
        });
      }

      // Add coverage areas
      for (const postcode of ukPostcodes) {
        await db.engineerCoverageArea.upsert({
          where: {
            engineerProfileId_postcodePrefix: {
              engineerProfileId: profile.id,
              postcodePrefix: postcode,
            },
          },
          update: { radiusKm: 50 },
          create: {
            engineerProfileId: profile.id,
            postcodePrefix: postcode,
            radiusKm: 50,
          },
        });
      }

      setupCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Setup ${setupCount} engineer(s) for auto-allocation`,
      engineers: setupCount,
      services: services.length,
      coverageAreas: ukPostcodes.length,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
