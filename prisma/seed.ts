import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { addDays, addWeeks, startOfDay } from "date-fns";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

function generateBookingRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "CC-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log("Seeding database with comprehensive data...");

  // Create Services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { slug: "pat-testing" },
      update: {},
      create: {
        name: "PAT Testing",
        slug: "pat-testing",
        description: "Portable Appliance Testing for electrical safety compliance",
        basePrice: 1.50,
        minCharge: 75,
        unitName: "item",
        icon: "Zap",
        baseMinutes: 30,
        minutesPerUnit: 2,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fire-alarm-testing" },
      update: {},
      create: {
        name: "Fire Alarm Testing",
        slug: "fire-alarm-testing",
        description: "Fire alarm system inspection and testing",
        basePrice: 8,
        minCharge: 150,
        unitName: "zone",
        icon: "Shield",
        baseMinutes: 45,
        minutesPerUnit: 15,
      },
    }),
    prisma.service.upsert({
      where: { slug: "emergency-lighting" },
      update: {},
      create: {
        name: "Emergency Lighting",
        slug: "emergency-lighting",
        description: "Emergency lighting inspection and testing",
        basePrice: 5,
        minCharge: 120,
        unitName: "unit",
        icon: "FileCheck",
        baseMinutes: 30,
        minutesPerUnit: 5,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fixed-wire-testing" },
      update: {},
      create: {
        name: "Fixed Wire Testing",
        slug: "fixed-wire-testing",
        description: "EICR - Electrical Installation Condition Report",
        basePrice: 15,
        minCharge: 200,
        unitName: "circuit",
        icon: "Building2",
        baseMinutes: 60,
        minutesPerUnit: 10,
      },
    }),
    prisma.service.upsert({
      where: { slug: "thermographic-survey" },
      update: {},
      create: {
        name: "Thermographic Survey",
        slug: "thermographic-survey",
        description: "Thermographic survey of electrical distribution boards to identify hot spots and potential failures",
        basePrice: 45,
        minCharge: 180,
        unitName: "board",
        icon: "Thermometer",
        baseMinutes: 30,
        minutesPerUnit: 15,
      },
    }),
    prisma.service.upsert({
      where: { slug: "thermal-imaging" },
      update: {},
      create: {
        name: "Thermal Imaging",
        slug: "thermal-imaging",
        description: "Comprehensive thermal imaging inspection for building systems and equipment",
        basePrice: 35,
        minCharge: 200,
        unitName: "area",
        icon: "Scan",
        baseMinutes: 45,
        minutesPerUnit: 20,
      },
    }),
    prisma.service.upsert({
      where: { slug: "cctv-servicing" },
      update: {},
      create: {
        name: "CCTV Servicing",
        slug: "cctv-servicing",
        description: "CCTV system inspection, maintenance, and servicing",
        basePrice: 25,
        minCharge: 150,
        unitName: "camera",
        icon: "Camera",
        baseMinutes: 30,
        minutesPerUnit: 10,
      },
    }),
  ]);

  console.log(`Created ${services.length} services`);

  // =====================
  // CLEANUP OLD SEED DATA
  // =====================

  // Delete old seed users and their related data
  const seedClerkIds = [
    "seed_engineer1_clerk_id", "seed_engineer2_clerk_id", "seed_engineer3_clerk_id",
    "seed_customer1_clerk_id", "seed_customer2_clerk_id", "seed_customer3_clerk_id",
    "engineer1_clerk_id", "engineer2_clerk_id", "engineer3_clerk_id",
    "customer1_clerk_id", "customer2_clerk_id", "customer3_clerk_id",
  ];

  const seedEmails = [
    "james.mitchell@complianceconnect.co.uk",
    "sarah.chen@complianceconnect.co.uk",
    "mike.thompson@complianceconnect.co.uk",
    "john.smith@acmecorp.co.uk",
    "lisa.brown@techinnovate.co.uk",
    "david.wilson@nlretail.co.uk",
  ];

  // Delete in order to respect foreign key constraints
  await prisma.asset.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.engineerAvailability.deleteMany({});
  await prisma.engineerCoverageArea.deleteMany({});
  await prisma.engineerQualification.deleteMany({});
  await prisma.engineerCompetency.deleteMany({});
  await prisma.engineerProfile.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      OR: [
        { clerkId: { in: seedClerkIds } },
        { email: { in: seedEmails } },
      ],
    },
  });

  console.log("Cleaned up old seed data");

  // =====================
  // CREATE ENGINEERS
  // =====================

  // Engineer 1: James Mitchell (Central/West London specialist)
  const engineer1 = await prisma.user.upsert({
    where: { clerkId: "seed_engineer1_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_engineer1_clerk_id",
      name: "James Mitchell",
      email: "james.mitchell@complianceconnect.co.uk",
      role: "ENGINEER",
      phone: "+44 7700 900123",
    },
  });

  const engineer1Profile = await prisma.engineerProfile.upsert({
    where: { userId: engineer1.id },
    update: {},
    create: {
      userId: engineer1.id,
      status: "APPROVED",
      approvedAt: new Date(),
      yearsExperience: 12,
      bio: "Senior electrical engineer specializing in PAT testing and fire safety systems. 12+ years experience across commercial and residential properties in Central London.",
      dayRate: 320,
    },
  });

  // Engineer 2: Sarah Chen (East London / Tech sector specialist)
  const engineer2 = await prisma.user.upsert({
    where: { clerkId: "seed_engineer2_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_engineer2_clerk_id",
      name: "Sarah Chen",
      email: "sarah.chen@complianceconnect.co.uk",
      role: "ENGINEER",
      phone: "+44 7700 900456",
    },
  });

  const engineer2Profile = await prisma.engineerProfile.upsert({
    where: { userId: engineer2.id },
    update: {},
    create: {
      userId: engineer2.id,
      status: "APPROVED",
      approvedAt: new Date(),
      yearsExperience: 8,
      bio: "Tech sector specialist with expertise in data center compliance and startup office testing. EICR certified.",
      dayRate: 290,
    },
  });

  // Engineer 3: Mike Thompson (North London)
  const engineer3 = await prisma.user.upsert({
    where: { clerkId: "seed_engineer3_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_engineer3_clerk_id",
      name: "Mike Thompson",
      email: "mike.thompson@complianceconnect.co.uk",
      role: "ENGINEER",
      phone: "+44 7700 900789",
    },
  });

  const engineer3Profile = await prisma.engineerProfile.upsert({
    where: { userId: engineer3.id },
    update: {},
    create: {
      userId: engineer3.id,
      status: "APPROVED",
      approvedAt: new Date(),
      yearsExperience: 15,
      bio: "Fire alarm and emergency lighting specialist. BAFE certified with extensive experience in retail and hospitality sectors.",
      dayRate: 350,
    },
  });

  // Add qualifications for all engineers
  await prisma.engineerQualification.createMany({
    data: [
      // James Mitchell
      { engineerProfileId: engineer1Profile.id, name: "18th Edition (BS 7671)", issuingBody: "City & Guilds", verified: true },
      { engineerProfileId: engineer1Profile.id, name: "City & Guilds 2391 (Inspection & Testing)", issuingBody: "City & Guilds", verified: true },
      { engineerProfileId: engineer1Profile.id, name: "PAT Testing Certification", issuingBody: "City & Guilds", verified: true },
      { engineerProfileId: engineer1Profile.id, name: "Fire Alarm BS 5839 Competency", issuingBody: "FIA", verified: true },
      // Sarah Chen
      { engineerProfileId: engineer2Profile.id, name: "18th Edition (BS 7671)", issuingBody: "City & Guilds", verified: true },
      { engineerProfileId: engineer2Profile.id, name: "City & Guilds 2391", issuingBody: "City & Guilds", verified: true },
      { engineerProfileId: engineer2Profile.id, name: "Data Center Compliance Specialist", issuingBody: "TIA", verified: true },
      // Mike Thompson
      { engineerProfileId: engineer3Profile.id, name: "Fire Alarm BS 5839 Competency", issuingBody: "FIA", verified: true },
      { engineerProfileId: engineer3Profile.id, name: "Emergency Lighting BS 5266", issuingBody: "IET", verified: true },
      { engineerProfileId: engineer3Profile.id, name: "BAFE SP203-1 Certification", issuingBody: "BAFE", verified: true },
    ],
    skipDuplicates: true,
  });

  // Add competencies
  for (const service of services) {
    // James - all services
    await prisma.engineerCompetency.upsert({
      where: { engineerProfileId_serviceId: { engineerProfileId: engineer1Profile.id, serviceId: service.id } },
      update: {},
      create: { engineerProfileId: engineer1Profile.id, serviceId: service.id, experienceYears: 10, certified: true },
    });
    // Sarah - PAT and Fixed Wire
    if (["pat-testing", "fixed-wire-testing"].includes(service.slug)) {
      await prisma.engineerCompetency.upsert({
        where: { engineerProfileId_serviceId: { engineerProfileId: engineer2Profile.id, serviceId: service.id } },
        update: {},
        create: { engineerProfileId: engineer2Profile.id, serviceId: service.id, experienceYears: 8, certified: true },
      });
    }
    // Mike - Fire and Emergency Lighting
    if (["fire-alarm-testing", "emergency-lighting"].includes(service.slug)) {
      await prisma.engineerCompetency.upsert({
        where: { engineerProfileId_serviceId: { engineerProfileId: engineer3Profile.id, serviceId: service.id } },
        update: {},
        create: { engineerProfileId: engineer3Profile.id, serviceId: service.id, experienceYears: 15, certified: true },
      });
    }
  }

  // Add coverage areas
  await prisma.engineerCoverageArea.createMany({
    data: [
      // James - Central/West London
      ...["SW1", "SW3", "SW5", "SW7", "SW10", "W1", "W2", "W8", "WC1", "WC2", "EC1", "EC2"].map(p => ({
        engineerProfileId: engineer1Profile.id, postcodePrefix: p, radiusKm: 15,
      })),
      // Sarah - East London
      ...["E1", "E2", "E3", "E14", "E15", "E16", "EC1", "EC2", "EC3", "EC4"].map(p => ({
        engineerProfileId: engineer2Profile.id, postcodePrefix: p, radiusKm: 12,
      })),
      // Mike - North London
      ...["N1", "N2", "N4", "N7", "N8", "NW1", "NW3", "NW5", "NW6", "NW8"].map(p => ({
        engineerProfileId: engineer3Profile.id, postcodePrefix: p, radiusKm: 12,
      })),
    ],
    skipDuplicates: true,
  });

  console.log("Created 3 engineers with profiles, qualifications, and coverage areas");

  // =====================
  // CREATE CUSTOMERS & SITES
  // =====================

  // Customer 1: ACME Corporation (multiple locations)
  const customer1 = await prisma.user.upsert({
    where: { clerkId: "seed_customer1_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_customer1_clerk_id",
      name: "John Smith",
      email: "john.smith@acmecorp.co.uk",
      role: "CUSTOMER",
      companyName: "ACME Corporation",
      phone: "+44 20 7946 0958",
    },
  });

  const customer1Sites = await Promise.all([
    prisma.site.upsert({
      where: { id: "acme_hq" },
      update: {},
      create: {
        id: "acme_hq",
        userId: customer1.id,
        name: "ACME London HQ",
        address: "123 Fleet Street",
        postcode: "EC4A 2BB",
        latitude: 51.5142,
        longitude: -0.1069,
        accessNotes: "Reception on ground floor. Ask for facilities.",
      },
    }),
    prisma.site.upsert({
      where: { id: "acme_warehouse" },
      update: {},
      create: {
        id: "acme_warehouse",
        userId: customer1.id,
        name: "ACME Warehouse",
        address: "45 Industrial Estate, Wandsworth",
        postcode: "SW18 4AA",
        latitude: 51.4549,
        longitude: -0.1919,
        accessNotes: "Security gate - call ahead. Loading bay access.",
      },
    }),
    prisma.site.upsert({
      where: { id: "acme_retail" },
      update: {},
      create: {
        id: "acme_retail",
        userId: customer1.id,
        name: "ACME Retail Store",
        address: "78 High Street, Kensington",
        postcode: "W8 4SG",
        latitude: 51.5006,
        longitude: -0.1925,
        accessNotes: "Access via rear entrance before 9am.",
      },
    }),
  ]);

  // Customer 2: Tech Innovate (startup)
  const customer2 = await prisma.user.upsert({
    where: { clerkId: "seed_customer2_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_customer2_clerk_id",
      name: "Lisa Brown",
      email: "lisa.brown@techinnovate.co.uk",
      role: "CUSTOMER",
      companyName: "Tech Innovate Ltd",
      phone: "+44 20 7123 4567",
    },
  });

  const customer2Sites = await Promise.all([
    prisma.site.upsert({
      where: { id: "tech_hub" },
      update: {},
      create: {
        id: "tech_hub",
        userId: customer2.id,
        name: "Tech Hub Office",
        address: "200 Old Street",
        postcode: "EC1V 9NR",
        latitude: 51.5263,
        longitude: -0.0873,
        accessNotes: "Buzzer code 4521. 3rd floor.",
      },
    }),
    prisma.site.upsert({
      where: { id: "tech_datacenter" },
      update: {},
      create: {
        id: "tech_datacenter",
        userId: customer2.id,
        name: "Data Center",
        address: "15 Docklands Way, Canary Wharf",
        postcode: "E14 9SH",
        latitude: 51.5055,
        longitude: -0.0235,
        accessNotes: "Security clearance required 24hrs in advance.",
      },
    }),
  ]);

  // Customer 3: North London Retail Group
  const customer3 = await prisma.user.upsert({
    where: { clerkId: "seed_customer3_clerk_id" },
    update: {},
    create: {
      clerkId: "seed_customer3_clerk_id",
      name: "David Wilson",
      email: "david.wilson@nlretail.co.uk",
      role: "CUSTOMER",
      companyName: "North London Retail Group",
      phone: "+44 20 7890 1234",
    },
  });

  const customer3Sites = await Promise.all([
    prisma.site.upsert({
      where: { id: "nlr_store1" },
      update: {},
      create: {
        id: "nlr_store1",
        userId: customer3.id,
        name: "Camden Store",
        address: "55 Camden High Street",
        postcode: "NW1 7JH",
        latitude: 51.5391,
        longitude: -0.1426,
        accessNotes: "Staff entrance on side street.",
      },
    }),
    prisma.site.upsert({
      where: { id: "nlr_store2" },
      update: {},
      create: {
        id: "nlr_store2",
        userId: customer3.id,
        name: "Islington Store",
        address: "120 Upper Street",
        postcode: "N1 1QP",
        latitude: 51.5441,
        longitude: -0.1025,
        accessNotes: "Ask for store manager on arrival.",
      },
    }),
  ]);

  console.log("Created 3 customers with 7 sites total");

  // =====================
  // CREATE BOOKINGS ACROSS 2 MONTHS
  // =====================

  const today = startOfDay(new Date());
  const allSites = [...customer1Sites, ...customer2Sites, ...customer3Sites];
  const engineers = [engineer1, engineer2, engineer3];
  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

  // Delete existing bookings first to avoid duplicates
  await prisma.asset.deleteMany({});
  await prisma.booking.deleteMany({});

  const bookingsToCreate: Array<{
    customerId: string;
    siteId: string;
    serviceId: string;
    engineerId?: string;
    scheduledDate: Date;
    slot: string;
    estimatedQty: number;
    quotedPrice: number;
    originalPrice: number;
    discountPercent: number;
    estimatedDuration: number;
    status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    notes?: string;
    startedAt?: Date;
    completedAt?: Date;
    engineerNotes?: string;
  }> = [];

  // Generate bookings for next 60 days
  for (let dayOffset = -14; dayOffset <= 60; dayOffset++) {
    const bookingDate = addDays(today, dayOffset);
    const dayOfWeek = bookingDate.getDay();

    // Skip weekends for most bookings
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Determine how many bookings this day (varies to create clusters)
    let bookingsThisDay = 0;

    // Create clusters of bookings on certain days for discount demonstration
    if (dayOffset % 7 === 0) {
      bookingsThisDay = 3; // Weekly cluster
    } else if (dayOffset % 3 === 0) {
      bookingsThisDay = 2; // Bi-weekly pair
    } else if (Math.random() > 0.6) {
      bookingsThisDay = 1; // Random single bookings
    }

    for (let b = 0; b < bookingsThisDay; b++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const site = allSites[Math.floor(Math.random() * allSites.length)];
      const customer = site.userId;
      const slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];

      // Determine engineer based on site location
      let assignedEngineer: typeof engineer1 | undefined;
      const postcode = site.postcode;
      if (postcode.startsWith("EC") || postcode.startsWith("W") || postcode.startsWith("SW")) {
        assignedEngineer = engineer1;
      } else if (postcode.startsWith("E")) {
        assignedEngineer = engineer2;
      } else if (postcode.startsWith("N")) {
        assignedEngineer = engineer3;
      }

      // Calculate quantity based on service
      let qty = 0;
      switch (service.slug) {
        case "pat-testing":
          qty = Math.floor(Math.random() * 150) + 30;
          break;
        case "fire-alarm-testing":
          qty = Math.floor(Math.random() * 12) + 4;
          break;
        case "emergency-lighting":
          qty = Math.floor(Math.random() * 40) + 10;
          break;
        case "fixed-wire-testing":
          qty = Math.floor(Math.random() * 20) + 8;
          break;
      }

      const basePrice = Math.max(service.basePrice * qty, service.minCharge);

      // Calculate discount based on nearby bookings
      let discount = 0;
      const nearbyBookings = bookingsToCreate.filter(bk => {
        const diff = Math.abs(bk.scheduledDate.getTime() - bookingDate.getTime());
        return diff < 2 * 24 * 60 * 60 * 1000; // Within 2 days
      });

      if (nearbyBookings.length >= 2) {
        discount = 50;
      } else if (nearbyBookings.length === 1) {
        discount = 25;
      } else if (bookingsThisDay > 1 && b > 0) {
        discount = 10;
      }

      const discountedPrice = basePrice * (1 - discount / 100);
      const duration = Math.ceil(service.baseMinutes + service.minutesPerUnit * qty);

      // Determine status based on date
      let status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "PENDING";
      let startedAt: Date | undefined;
      let completedAt: Date | undefined;
      let engineerNotes: string | undefined;

      if (dayOffset < -7) {
        status = "COMPLETED";
        startedAt = bookingDate;
        completedAt = bookingDate;
        engineerNotes = "Job completed successfully. All items tested and certified.";
      } else if (dayOffset < 0) {
        status = Math.random() > 0.2 ? "COMPLETED" : "CANCELLED";
        if (status === "COMPLETED") {
          startedAt = bookingDate;
          completedAt = bookingDate;
          engineerNotes = "Work completed as scheduled.";
        }
      } else if (dayOffset === 0) {
        status = Math.random() > 0.5 ? "IN_PROGRESS" : "CONFIRMED";
        if (status === "IN_PROGRESS") {
          startedAt = new Date();
        }
      } else if (dayOffset <= 7) {
        status = Math.random() > 0.3 ? "CONFIRMED" : "PENDING";
      }

      bookingsToCreate.push({
        customerId: customer,
        siteId: site.id,
        serviceId: service.id,
        engineerId: status !== "PENDING" && status !== "CANCELLED" ? assignedEngineer?.id : undefined,
        scheduledDate: bookingDate,
        slot,
        estimatedQty: qty,
        quotedPrice: Math.round(discountedPrice * 100) / 100,
        originalPrice: Math.round(basePrice * 100) / 100,
        discountPercent: discount,
        estimatedDuration: duration,
        status,
        notes: `${service.name} for ${qty} ${service.unitName}s`,
        startedAt,
        completedAt,
        engineerNotes,
      });
    }
  }

  // Create all bookings
  for (const booking of bookingsToCreate) {
    await prisma.booking.create({
      data: {
        reference: generateBookingRef(),
        ...booking,
      },
    });
  }

  console.log(`Created ${bookingsToCreate.length} bookings across 2 months`);

  // =====================
  // SET ENGINEER AVAILABILITY
  // =====================

  const availabilityData: Array<{
    engineerProfileId: string;
    date: Date;
    slot: string;
    isAvailable: boolean;
  }> = [];

  // Set availability for next 60 days for all engineers
  for (let i = 0; i < 60; i++) {
    const date = startOfDay(addDays(today, i));
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const profile of [engineer1Profile, engineer2Profile, engineer3Profile]) {
      // AM slot
      availabilityData.push({
        engineerProfileId: profile.id,
        date,
        slot: "AM",
        isAvailable: !isWeekend && Math.random() > 0.1, // 90% available on weekdays
      });
      // PM slot
      availabilityData.push({
        engineerProfileId: profile.id,
        date,
        slot: "PM",
        isAvailable: !isWeekend && Math.random() > 0.15, // 85% available on weekdays
      });
    }
  }

  for (const av of availabilityData) {
    await prisma.engineerAvailability.upsert({
      where: {
        engineerProfileId_date_slot: {
          engineerProfileId: av.engineerProfileId,
          date: av.date,
          slot: av.slot,
        },
      },
      update: { isAvailable: av.isAvailable },
      create: av,
    });
  }

  console.log("Set engineer availability for 60 days");

  // Create admin user
  await prisma.user.upsert({
    where: { email: "admin@complianceconnect.co.uk" },
    update: {},
    create: {
      clerkId: "admin_clerk_id",
      name: "Admin User",
      email: "admin@complianceconnect.co.uk",
      role: "ADMIN",
    },
  });

  console.log("Created admin user");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
