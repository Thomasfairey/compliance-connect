import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

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
  ]);

  console.log(`Created ${services.length} services`);

  // Create demo engineer user (if not exists)
  const demoEngineer = await prisma.user.upsert({
    where: { email: "demo.engineer@complianceconnect.co.uk" },
    update: {},
    create: {
      clerkId: "demo_engineer_clerk_id",
      name: "James Mitchell",
      email: "demo.engineer@complianceconnect.co.uk",
      role: "ENGINEER",
      phone: "+44 7700 900123",
    },
  });

  // Create engineer profile
  const engineerProfile = await prisma.engineerProfile.upsert({
    where: { userId: demoEngineer.id },
    update: {},
    create: {
      userId: demoEngineer.id,
      status: "APPROVED",
      approvedAt: new Date(),
      yearsExperience: 12,
      bio: "Experienced electrical engineer with over 12 years in compliance testing. Specializing in PAT testing, fire alarm systems, and EICR inspections across London.",
      dayRate: 280,
    },
  });

  // Add qualifications
  await prisma.engineerQualification.createMany({
    data: [
      {
        engineerProfileId: engineerProfile.id,
        name: "18th Edition (BS 7671)",
        issuingBody: "City & Guilds",
        certificateNumber: "CG-2382-2021-JM",
        verified: true,
      },
      {
        engineerProfileId: engineerProfile.id,
        name: "City & Guilds 2391 (Inspection & Testing)",
        issuingBody: "City & Guilds",
        certificateNumber: "CG-2391-2020-JM",
        verified: true,
      },
      {
        engineerProfileId: engineerProfile.id,
        name: "PAT Testing Certification",
        issuingBody: "City & Guilds",
        verified: true,
      },
      {
        engineerProfileId: engineerProfile.id,
        name: "Fire Alarm BS 5839 Competency",
        issuingBody: "FIA",
        verified: true,
      },
    ],
    skipDuplicates: true,
  });

  // Add competencies
  for (const service of services) {
    await prisma.engineerCompetency.upsert({
      where: {
        engineerProfileId_serviceId: {
          engineerProfileId: engineerProfile.id,
          serviceId: service.id,
        },
      },
      update: {},
      create: {
        engineerProfileId: engineerProfile.id,
        serviceId: service.id,
        experienceYears: Math.floor(Math.random() * 10) + 3,
        certified: true,
      },
    });
  }

  // Add coverage areas
  const coverageAreas = ["SW1", "SW3", "SW5", "SW7", "SW10", "W1", "W2", "W8", "WC1", "WC2", "EC1", "EC2"];
  await prisma.engineerCoverageArea.createMany({
    data: coverageAreas.map((postcode) => ({
      engineerProfileId: engineerProfile.id,
      postcodePrefix: postcode,
      radiusKm: 15,
    })),
    skipDuplicates: true,
  });

  console.log("Created engineer profile with qualifications and coverage areas");

  // Create a second demo engineer (pending approval)
  const pendingEngineer = await prisma.user.upsert({
    where: { email: "sarah.jones@email.com" },
    update: {},
    create: {
      clerkId: "pending_engineer_clerk_id",
      name: "Sarah Jones",
      email: "sarah.jones@email.com",
      role: "ENGINEER",
      phone: "+44 7700 900456",
    },
  });

  const pendingProfile = await prisma.engineerProfile.upsert({
    where: { userId: pendingEngineer.id },
    update: {},
    create: {
      userId: pendingEngineer.id,
      status: "PENDING_APPROVAL",
      yearsExperience: 5,
      bio: "Qualified electrical engineer looking to join the Compliance Connect network. Experienced in PAT testing and emergency lighting inspections.",
      dayRate: 220,
    },
  });

  // Add basic qualifications for pending engineer
  await prisma.engineerQualification.createMany({
    data: [
      {
        engineerProfileId: pendingProfile.id,
        name: "18th Edition (BS 7671)",
        issuingBody: "City & Guilds",
        verified: false,
      },
      {
        engineerProfileId: pendingProfile.id,
        name: "PAT Testing Certification",
        issuingBody: "City & Guilds",
        verified: false,
      },
    ],
    skipDuplicates: true,
  });

  // Add competencies for pending engineer
  const patService = services.find((s) => s.slug === "pat-testing");
  const emergencyService = services.find((s) => s.slug === "emergency-lighting");
  if (patService) {
    await prisma.engineerCompetency.upsert({
      where: {
        engineerProfileId_serviceId: {
          engineerProfileId: pendingProfile.id,
          serviceId: patService.id,
        },
      },
      update: {},
      create: {
        engineerProfileId: pendingProfile.id,
        serviceId: patService.id,
        experienceYears: 5,
        certified: true,
      },
    });
  }
  if (emergencyService) {
    await prisma.engineerCompetency.upsert({
      where: {
        engineerProfileId_serviceId: {
          engineerProfileId: pendingProfile.id,
          serviceId: emergencyService.id,
        },
      },
      update: {},
      create: {
        engineerProfileId: pendingProfile.id,
        serviceId: emergencyService.id,
        experienceYears: 3,
        certified: true,
      },
    });
  }

  // Add coverage areas for pending engineer
  await prisma.engineerCoverageArea.createMany({
    data: ["E1", "E2", "E3", "E14", "E15"].map((postcode) => ({
      engineerProfileId: pendingProfile.id,
      postcodePrefix: postcode,
      radiusKm: 10,
    })),
    skipDuplicates: true,
  });

  console.log("Created pending engineer profile");

  // Create demo customer user
  const demoCustomer = await prisma.user.upsert({
    where: { email: "demo.customer@acmecorp.co.uk" },
    update: {},
    create: {
      clerkId: "demo_customer_clerk_id",
      name: "John Smith",
      email: "demo.customer@acmecorp.co.uk",
      role: "CUSTOMER",
      companyName: "ACME Corporation",
      phone: "+44 20 7946 0958",
    },
  });

  // Create sites for demo customer
  const sites = await Promise.all([
    prisma.site.upsert({
      where: { id: "demo_site_1" },
      update: {},
      create: {
        id: "demo_site_1",
        userId: demoCustomer.id,
        name: "London HQ",
        address: "123 Fleet Street",
        postcode: "EC4A 2BB",
        latitude: 51.5142,
        longitude: -0.1069,
        accessNotes: "Reception on ground floor. Ask for facilities manager.",
      },
    }),
    prisma.site.upsert({
      where: { id: "demo_site_2" },
      update: {},
      create: {
        id: "demo_site_2",
        userId: demoCustomer.id,
        name: "Warehouse",
        address: "45 Industrial Estate",
        postcode: "SW6 3AA",
        latitude: 51.4717,
        longitude: -0.2083,
        accessNotes: "Main entrance on Park Road. Report to security.",
      },
    }),
    prisma.site.upsert({
      where: { id: "demo_site_3" },
      update: {},
      create: {
        id: "demo_site_3",
        userId: demoCustomer.id,
        name: "Retail Store",
        address: "78 High Street, Kensington",
        postcode: "W8 4SG",
        latitude: 51.5006,
        longitude: -0.1925,
        accessNotes: "Access via rear entrance before 9am.",
      },
    }),
  ]);

  console.log(`Created ${sites.length} sites`);

  // Create a third approved engineer
  const engineer3 = await prisma.user.upsert({
    where: { email: "mike.thompson@email.com" },
    update: {},
    create: {
      clerkId: "engineer3_clerk_id",
      name: "Mike Thompson",
      email: "mike.thompson@email.com",
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
      yearsExperience: 8,
      bio: "Specialist in fire alarm systems and emergency lighting. BAFE certified.",
      dayRate: 260,
    },
  });

  await prisma.engineerQualification.createMany({
    data: [
      {
        engineerProfileId: engineer3Profile.id,
        name: "Fire Alarm BS 5839 Competency",
        issuingBody: "FIA",
        verified: true,
      },
      {
        engineerProfileId: engineer3Profile.id,
        name: "Emergency Lighting BS 5266",
        issuingBody: "IET",
        verified: true,
      },
    ],
    skipDuplicates: true,
  });

  const fireService = services.find((s) => s.slug === "fire-alarm-testing");
  if (fireService) {
    await prisma.engineerCompetency.upsert({
      where: {
        engineerProfileId_serviceId: {
          engineerProfileId: engineer3Profile.id,
          serviceId: fireService.id,
        },
      },
      update: {},
      create: {
        engineerProfileId: engineer3Profile.id,
        serviceId: fireService.id,
        experienceYears: 8,
        certified: true,
      },
    });
  }
  if (emergencyService) {
    await prisma.engineerCompetency.upsert({
      where: {
        engineerProfileId_serviceId: {
          engineerProfileId: engineer3Profile.id,
          serviceId: emergencyService.id,
        },
      },
      update: {},
      create: {
        engineerProfileId: engineer3Profile.id,
        serviceId: emergencyService.id,
        experienceYears: 8,
        certified: true,
      },
    });
  }

  await prisma.engineerCoverageArea.createMany({
    data: ["N1", "N2", "N4", "N7", "NW1", "NW3", "NW5"].map((postcode) => ({
      engineerProfileId: engineer3Profile.id,
      postcodePrefix: postcode,
      radiusKm: 12,
    })),
    skipDuplicates: true,
  });

  console.log("Created third engineer (Mike Thompson - approved)");

  // Create second customer
  const customer2 = await prisma.user.upsert({
    where: { email: "lisa.brown@techinnovate.co.uk" },
    update: {},
    create: {
      clerkId: "customer2_clerk_id",
      name: "Lisa Brown",
      email: "lisa.brown@techinnovate.co.uk",
      role: "CUSTOMER",
      companyName: "Tech Innovate Ltd",
      phone: "+44 20 7123 4567",
    },
  });

  const customer2Sites = await Promise.all([
    prisma.site.upsert({
      where: { id: "tech_site_1" },
      update: {},
      create: {
        id: "tech_site_1",
        userId: customer2.id,
        name: "Tech Hub",
        address: "200 Old Street",
        postcode: "EC1V 9NR",
        latitude: 51.5263,
        longitude: -0.0873,
        accessNotes: "Buzzer code 4521. Take lift to 3rd floor.",
      },
    }),
    prisma.site.upsert({
      where: { id: "tech_site_2" },
      update: {},
      create: {
        id: "tech_site_2",
        userId: customer2.id,
        name: "Data Center",
        address: "15 Docklands Way",
        postcode: "E14 9SH",
        latitude: 51.5055,
        longitude: -0.0235,
        accessNotes: "Security clearance required. Contact security@techinnovate.co.uk 24hrs in advance.",
      },
    }),
  ]);

  console.log("Created second customer with sites");

  // Create bookings with various statuses
  const today = new Date();

  // PENDING bookings (no engineer assigned)
  await prisma.booking.upsert({
    where: { reference: "BK-2024-001" },
    update: {},
    create: {
      reference: "BK-2024-001",
      customerId: demoCustomer.id,
      siteId: sites[0].id,
      serviceId: services[0].id,
      scheduledDate: addDays(today, 5),
      slot: "AM",
      estimatedQty: 120,
      quotedPrice: 180,
      originalPrice: 180,
      discountPercent: 0,
      estimatedDuration: 270,
      status: "PENDING",
      notes: "New office equipment needs testing before deployment",
    },
  });

  await prisma.booking.upsert({
    where: { reference: "BK-2024-002" },
    update: {},
    create: {
      reference: "BK-2024-002",
      customerId: customer2.id,
      siteId: customer2Sites[0].id,
      serviceId: services[1].id,
      scheduledDate: addDays(today, 7),
      slot: "AM",
      estimatedQty: 8,
      quotedPrice: 150,
      originalPrice: 150,
      discountPercent: 0,
      estimatedDuration: 165,
      status: "PENDING",
      notes: "Annual fire alarm inspection",
    },
  });

  // CONFIRMED bookings (engineer assigned)
  await prisma.booking.upsert({
    where: { reference: "BK-2024-003" },
    update: {},
    create: {
      reference: "BK-2024-003",
      customerId: demoCustomer.id,
      siteId: sites[1].id,
      serviceId: services[0].id,
      scheduledDate: addDays(today, 2),
      slot: "AM",
      estimatedQty: 200,
      quotedPrice: 300,
      originalPrice: 300,
      discountPercent: 0,
      estimatedDuration: 430,
      status: "CONFIRMED",
      engineerId: demoEngineer.id,
      notes: "Warehouse equipment PAT test - include forklift chargers",
    },
  });

  await prisma.booking.upsert({
    where: { reference: "BK-2024-004" },
    update: {},
    create: {
      reference: "BK-2024-004",
      customerId: demoCustomer.id,
      siteId: sites[2].id,
      serviceId: services[2].id,
      scheduledDate: addDays(today, 2),
      slot: "PM",
      estimatedQty: 30,
      quotedPrice: 112.50,
      originalPrice: 150,
      discountPercent: 25,
      estimatedDuration: 180,
      status: "CONFIRMED",
      engineerId: demoEngineer.id,
      notes: "Same day as warehouse job - should get discount",
    },
  });

  await prisma.booking.upsert({
    where: { reference: "BK-2024-005" },
    update: {},
    create: {
      reference: "BK-2024-005",
      customerId: customer2.id,
      siteId: customer2Sites[1].id,
      serviceId: services[3].id,
      scheduledDate: addDays(today, 4),
      slot: "AM",
      estimatedQty: 15,
      quotedPrice: 225,
      originalPrice: 225,
      discountPercent: 0,
      estimatedDuration: 210,
      status: "CONFIRMED",
      engineerId: demoEngineer.id,
      notes: "EICR inspection for data center - critical infrastructure",
    },
  });

  // IN_PROGRESS booking
  await prisma.booking.upsert({
    where: { reference: "BK-2024-006" },
    update: {},
    create: {
      reference: "BK-2024-006",
      customerId: demoCustomer.id,
      siteId: sites[0].id,
      serviceId: services[1].id,
      scheduledDate: today,
      slot: "AM",
      estimatedQty: 10,
      quotedPrice: 150,
      originalPrice: 150,
      discountPercent: 0,
      estimatedDuration: 195,
      status: "IN_PROGRESS",
      engineerId: demoEngineer.id,
      startedAt: new Date(),
      notes: "Quarterly fire alarm test - all zones",
    },
  });

  // COMPLETED bookings with assets
  const completedBooking1 = await prisma.booking.upsert({
    where: { reference: "BK-2024-007" },
    update: {},
    create: {
      reference: "BK-2024-007",
      customerId: demoCustomer.id,
      siteId: sites[0].id,
      serviceId: services[0].id,
      scheduledDate: addDays(today, -7),
      slot: "AM",
      estimatedQty: 85,
      quotedPrice: 127.50,
      originalPrice: 127.50,
      discountPercent: 0,
      estimatedDuration: 200,
      status: "COMPLETED",
      engineerId: demoEngineer.id,
      startedAt: addDays(today, -7),
      completedAt: addDays(today, -7),
      engineerNotes: "All items tested successfully. 3 items failed and tagged for replacement.",
      certificateUrl: "/certificates/BK-2024-007.pdf",
    },
  });

  // Add test assets for completed booking
  await prisma.asset.createMany({
    data: [
      { bookingId: completedBooking1.id, assetTag: "PAT-001", name: "Laptop Charger", location: "Office 1", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-002", name: "Monitor", location: "Office 1", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-003", name: "Desk Lamp", location: "Office 1", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-004", name: "Kettle", location: "Kitchen", status: "FAIL", notes: "Damaged cable - replace immediately" },
      { bookingId: completedBooking1.id, assetTag: "PAT-005", name: "Microwave", location: "Kitchen", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-006", name: "Fridge", location: "Kitchen", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-007", name: "Printer", location: "Print Room", status: "PASS" },
      { bookingId: completedBooking1.id, assetTag: "PAT-008", name: "Shredder", location: "Print Room", status: "FAIL", notes: "Earth fault - needs repair" },
      { bookingId: completedBooking1.id, assetTag: "PAT-009", name: "Fan Heater", location: "Reception", status: "FAIL", notes: "Overheating detected - do not use" },
      { bookingId: completedBooking1.id, assetTag: "PAT-010", name: "Coffee Machine", location: "Kitchen", status: "PASS" },
    ],
    skipDuplicates: true,
  });

  const completedBooking2 = await prisma.booking.upsert({
    where: { reference: "BK-2024-008" },
    update: {},
    create: {
      reference: "BK-2024-008",
      customerId: customer2.id,
      siteId: customer2Sites[0].id,
      serviceId: services[2].id,
      scheduledDate: addDays(today, -14),
      slot: "PM",
      estimatedQty: 45,
      quotedPrice: 225,
      originalPrice: 225,
      discountPercent: 0,
      estimatedDuration: 255,
      status: "COMPLETED",
      engineerId: engineer3.id,
      startedAt: addDays(today, -14),
      completedAt: addDays(today, -14),
      engineerNotes: "All emergency lights operational. Battery replacement recommended for units in server room within 6 months.",
      certificateUrl: "/certificates/BK-2024-008.pdf",
    },
  });

  await prisma.asset.createMany({
    data: [
      { bookingId: completedBooking2.id, assetTag: "EL-001", name: "Exit Sign - Main", location: "Ground Floor", status: "PASS" },
      { bookingId: completedBooking2.id, assetTag: "EL-002", name: "Exit Sign - Rear", location: "Ground Floor", status: "PASS" },
      { bookingId: completedBooking2.id, assetTag: "EL-003", name: "Bulkhead Light", location: "Stairwell", status: "PASS" },
      { bookingId: completedBooking2.id, assetTag: "EL-004", name: "Maintained Fitting", location: "Server Room", status: "PASS", notes: "Battery at 70% - schedule replacement" },
      { bookingId: completedBooking2.id, assetTag: "EL-005", name: "Non-maintained Fitting", location: "Server Room", status: "PASS" },
    ],
    skipDuplicates: true,
  });

  // CANCELLED booking
  await prisma.booking.upsert({
    where: { reference: "BK-2024-009" },
    update: {},
    create: {
      reference: "BK-2024-009",
      customerId: demoCustomer.id,
      siteId: sites[1].id,
      serviceId: services[3].id,
      scheduledDate: addDays(today, -3),
      slot: "AM",
      estimatedQty: 20,
      quotedPrice: 300,
      originalPrice: 300,
      discountPercent: 0,
      estimatedDuration: 260,
      status: "CANCELLED",
      notes: "Customer requested cancellation - site access issue",
    },
  });

  console.log("Created 9 bookings with various statuses");

  // Set engineer availability for next 2 weeks
  const availabilityData = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // James Mitchell availability
    availabilityData.push({
      engineerProfileId: engineerProfile.id,
      date: new Date(date.toISOString().split("T")[0]),
      slot: "AM",
      isAvailable: !isWeekend,
    });
    availabilityData.push({
      engineerProfileId: engineerProfile.id,
      date: new Date(date.toISOString().split("T")[0]),
      slot: "PM",
      isAvailable: !isWeekend && i !== 3, // Block one PM slot
    });

    // Mike Thompson availability
    availabilityData.push({
      engineerProfileId: engineer3Profile.id,
      date: new Date(date.toISOString().split("T")[0]),
      slot: "AM",
      isAvailable: !isWeekend && i !== 1, // Block one AM slot
    });
    availabilityData.push({
      engineerProfileId: engineer3Profile.id,
      date: new Date(date.toISOString().split("T")[0]),
      slot: "PM",
      isAvailable: !isWeekend,
    });
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

  console.log("Set engineer availability for 2 weeks");

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
