import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, BuildingType, IndustryType, BookingStatus, EngineerType } from "@prisma/client";
import { addDays, subDays, startOfDay } from "date-fns";

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

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// UK Cities with realistic postcodes
const UK_REGIONS = [
  // London - 10 customers
  { city: "London", postcodes: ["SW1A 1AA", "EC2A 1NT", "W1D 3QF", "SE1 9SG", "NW1 6XE", "E1 6AN", "N1 9GU", "WC2N 5DU", "W2 1JB", "SW3 1AA"] },
  // Manchester - 3 customers
  { city: "Manchester", postcodes: ["M1 2WD", "M2 5DB", "M4 1HQ"] },
  // Birmingham - 3 customers
  { city: "Birmingham", postcodes: ["B1 1RS", "B2 4QA", "B3 3HJ"] },
  // Leeds - 2 customers
  { city: "Leeds", postcodes: ["LS1 4AP", "LS2 7EW"] },
  // Edinburgh - 2 customers
  { city: "Edinburgh", postcodes: ["EH1 1YS", "EH2 4RG"] },
  // Bristol - 2 customers
  { city: "Bristol", postcodes: ["BS1 4QA", "BS2 0JA"] },
  // Cardiff - 1 customer
  { city: "Cardiff", postcodes: ["CF10 1EP"] },
  // Newcastle - 1 customer
  { city: "Newcastle", postcodes: ["NE1 4ST"] },
  // Southampton - 1 customer
  { city: "Southampton", postcodes: ["SO14 2AQ"] },
];

const COMPANY_NAMES = [
  "Apex Technologies Ltd", "Sterling Retail Group", "Phoenix Manufacturing",
  "Horizon Healthcare", "Metro Commercial", "Atlas Logistics", "Zenith Finance",
  "Pinnacle Properties", "Quantum Solutions", "Nova Enterprises",
  "Vertex Holdings", "Summit Industries", "Nebula Tech", "Orion Services",
  "Titan Corporation", "Eclipse Ventures", "Fusion Consulting", "Stellar Partners",
  "Dynasty Group", "Momentum Business", "Vanguard Systems", "Catalyst Ltd",
  "Infinity Trading", "Pioneer Works", "Legacy Enterprises"
];

const BUILDING_TYPES: BuildingType[] = ["OFFICE", "RETAIL", "WAREHOUSE", "RESTAURANT", "HOTEL"];
const INDUSTRY_TYPES: IndustryType[] = ["TECHNOLOGY", "FINANCE", "RETAIL", "HOSPITALITY", "MANUFACTURING"];

async function main() {
  console.log("🚀 Starting comprehensive seed with 250 bookings...\n");

  // =====================
  // CLEANUP
  // =====================
  console.log("🧹 Cleaning up old data...");

  await prisma.pATTestLog.deleteMany({});
  await prisma.generatedReport.deleteMany({});
  await prisma.reportTemplate.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.bookingBundle.deleteMany({});
  await prisma.bundleItem.deleteMany({});
  await prisma.serviceBundle.deleteMany({});
  await prisma.engineerAvailability.deleteMany({});
  await prisma.engineerCoverageArea.deleteMany({});
  await prisma.engineerQualification.deleteMany({});
  await prisma.engineerCompetency.deleteMany({});
  await prisma.engineerProfile.deleteMany({});
  await prisma.complianceReminder.deleteMany({});
  await prisma.upsellSuggestion.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.allocationLog.deleteMany({});
  await prisma.siteProfile.deleteMany({});
  await prisma.site.deleteMany({});

  // Delete seed users
  await prisma.user.deleteMany({
    where: {
      email: { contains: "@seed.complianceconnect.co.uk" },
    },
  });

  console.log("✅ Cleanup complete!\n");

  // =====================
  // CREATE SERVICES
  // =====================
  console.log("📦 Creating services...");

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
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fire-alarm-testing" },
      update: {},
      create: {
        name: "Fire Alarm Testing",
        slug: "fire-alarm-testing",
        description: "Comprehensive fire alarm system testing and certification",
        basePrice: 8,
        minCharge: 150,
        unitName: "zone",
        icon: "Shield",
        baseMinutes: 45,
        minutesPerUnit: 15,
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "emergency-lighting" },
      update: {},
      create: {
        name: "Emergency Lighting",
        slug: "emergency-lighting",
        description: "Emergency lighting testing and maintenance",
        basePrice: 5,
        minCharge: 120,
        unitName: "unit",
        icon: "FileCheck",
        baseMinutes: 30,
        minutesPerUnit: 5,
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fixed-wire-testing" },
      update: {},
      create: {
        name: "Fixed Wire Testing (EICR)",
        slug: "fixed-wire-testing",
        description: "Electrical Installation Condition Report",
        basePrice: 15,
        minCharge: 200,
        unitName: "circuit",
        icon: "Building2",
        baseMinutes: 60,
        minutesPerUnit: 20,
        complianceIntervalMonths: 60,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fire-extinguisher-servicing" },
      update: {},
      create: {
        name: "Fire Extinguisher Servicing",
        slug: "fire-extinguisher-servicing",
        description: "Annual inspection and servicing of fire extinguishers",
        basePrice: 8,
        minCharge: 80,
        unitName: "extinguisher",
        icon: "Shield",
        baseMinutes: 15,
        minutesPerUnit: 5,
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "fire-risk-assessment" },
      update: {},
      create: {
        name: "Fire Risk Assessment",
        slug: "fire-risk-assessment",
        description: "Comprehensive fire risk assessment for compliance",
        basePrice: 250,
        minCharge: 250,
        unitName: "assessment",
        icon: "FileCheck",
        baseMinutes: 180,
        minutesPerUnit: 0,
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "health-safety-assessment" },
      update: {},
      create: {
        name: "Health & Safety Risk Assessment",
        slug: "health-safety-assessment",
        description: "Comprehensive workplace health and safety assessment",
        basePrice: 200,
        minCharge: 200,
        unitName: "assessment",
        icon: "FileCheck",
        baseMinutes: 240,
        minutesPerUnit: 0,
        complianceIntervalMonths: 12,
      },
    }),
    prisma.service.upsert({
      where: { slug: "legionella-risk-assessment" },
      update: {},
      create: {
        name: "Legionella Risk Assessment",
        slug: "legionella-risk-assessment",
        description: "Water system legionella risk assessment",
        basePrice: 180,
        minCharge: 180,
        unitName: "assessment",
        icon: "Droplets",
        baseMinutes: 120,
        minutesPerUnit: 0,
        complianceIntervalMonths: 24,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services\n`);

  // =====================
  // CREATE SERVICE BUNDLES
  // =====================
  console.log("📦 Creating service bundles...");

  const patService = services.find(s => s.slug === "pat-testing")!;
  const fireAlarmService = services.find(s => s.slug === "fire-alarm-testing")!;
  const emergencyLightingService = services.find(s => s.slug === "emergency-lighting")!;
  const fixedWireService = services.find(s => s.slug === "fixed-wire-testing")!;
  const fireExtService = services.find(s => s.slug === "fire-extinguisher-servicing")!;
  const fireRiskService = services.find(s => s.slug === "fire-risk-assessment")!;
  const hsService = services.find(s => s.slug === "health-safety-assessment")!;

  const bundles = await Promise.all([
    prisma.serviceBundle.create({
      data: {
        name: "Annual Compliance Package",
        slug: "annual-compliance",
        description: "Complete annual compliance testing bundle",
        discountPercent: 15,
        icon: "Package",
        recommendedFor: ["OFFICE", "RETAIL"],
        items: {
          create: [
            { serviceId: patService.id, includedQty: 50 },
            { serviceId: fireAlarmService.id, includedQty: 4 },
            { serviceId: emergencyLightingService.id, includedQty: 20 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "Fire Safety Bundle",
        slug: "fire-safety",
        description: "Comprehensive fire safety compliance package",
        discountPercent: 20,
        icon: "Flame",
        recommendedFor: ["RESTAURANT", "HOTEL", "RETAIL"],
        items: {
          create: [
            { serviceId: fireAlarmService.id, includedQty: 6 },
            { serviceId: emergencyLightingService.id, includedQty: 30 },
            { serviceId: fireExtService.id, includedQty: 10 },
            { serviceId: fireRiskService.id, includedQty: 1 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "Electrical Safety Bundle",
        slug: "electrical-safety",
        description: "Full electrical safety compliance package",
        discountPercent: 18,
        icon: "Zap",
        recommendedFor: ["OFFICE", "WAREHOUSE", "MANUFACTURING"],
        items: {
          create: [
            { serviceId: patService.id, includedQty: 100 },
            { serviceId: fixedWireService.id, includedQty: 24 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "Restaurant Compliance",
        slug: "restaurant-compliance",
        description: "Complete compliance package for restaurants",
        discountPercent: 22,
        icon: "UtensilsCrossed",
        recommendedFor: ["RESTAURANT"],
        items: {
          create: [
            { serviceId: patService.id, includedQty: 30 },
            { serviceId: fireAlarmService.id, includedQty: 3 },
            { serviceId: fireExtService.id, includedQty: 5 },
            { serviceId: hsService.id, includedQty: 1 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "New Premises Setup",
        slug: "new-premises-setup",
        description: "Essential compliance for new business premises",
        discountPercent: 25,
        icon: "Building",
        recommendedFor: ["OFFICE", "RETAIL", "WAREHOUSE"],
        items: {
          create: [
            { serviceId: fixedWireService.id, includedQty: 16 },
            { serviceId: fireRiskService.id, includedQty: 1 },
            { serviceId: emergencyLightingService.id, includedQty: 25 },
            { serviceId: patService.id, includedQty: 40 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "Tech Office Bundle",
        slug: "tech-office",
        description: "Ideal for technology companies with high equipment density",
        discountPercent: 15,
        icon: "Monitor",
        recommendedFor: ["OFFICE"],
        items: {
          create: [
            { serviceId: patService.id, includedQty: 150 },
            { serviceId: fixedWireService.id, includedQty: 32 },
          ],
        },
      },
    }),
    prisma.serviceBundle.create({
      data: {
        name: "Warehouse Safety Package",
        slug: "warehouse-safety",
        description: "Complete safety compliance for warehouse facilities",
        discountPercent: 20,
        icon: "Warehouse",
        recommendedFor: ["WAREHOUSE", "MANUFACTURING"],
        items: {
          create: [
            { serviceId: patService.id, includedQty: 80 },
            { serviceId: fireAlarmService.id, includedQty: 8 },
            { serviceId: emergencyLightingService.id, includedQty: 40 },
            { serviceId: hsService.id, includedQty: 1 },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${bundles.length} service bundles\n`);

  // =====================
  // CREATE ENGINEERS (8 total)
  // =====================
  console.log("👷 Creating engineers...");

  const engineerData = [
    // PAT Testers (3)
    { name: "James Mitchell", email: "james.mitchell@seed.complianceconnect.co.uk", type: "PAT_TESTER" as EngineerType, postcodes: ["SW", "W", "WC"], dayRate: 280, testRate: 0.45 },
    { name: "Sarah Chen", email: "sarah.chen@seed.complianceconnect.co.uk", type: "PAT_TESTER" as EngineerType, postcodes: ["E", "EC"], dayRate: 290, testRate: 0.45 },
    { name: "Tom Williams", email: "tom.williams@seed.complianceconnect.co.uk", type: "PAT_TESTER" as EngineerType, postcodes: ["N", "NW"], dayRate: 275, testRate: 0.45 },
    // Electricians (2)
    { name: "Mike Thompson", email: "mike.thompson@seed.complianceconnect.co.uk", type: "ELECTRICIAN" as EngineerType, postcodes: ["SE", "SW", "BR"], dayRate: 350, labourPercentage: 0.40 },
    { name: "David Clarke", email: "david.clarke@seed.complianceconnect.co.uk", type: "ELECTRICIAN" as EngineerType, postcodes: ["M", "SK", "WA"], dayRate: 340, labourPercentage: 0.40 },
    // Consultants (2)
    { name: "Emma Roberts", email: "emma.roberts@seed.complianceconnect.co.uk", type: "CONSULTANT" as EngineerType, postcodes: ["B", "CV", "WS"], dayRate: 400 },
    { name: "Chris Taylor", email: "chris.taylor@seed.complianceconnect.co.uk", type: "CONSULTANT" as EngineerType, postcodes: ["LS", "BD", "HX"], dayRate: 400 },
    // General (1)
    { name: "Alex Johnson", email: "alex.johnson@seed.complianceconnect.co.uk", type: "GENERAL" as EngineerType, postcodes: ["BS", "BA", "GL"], dayRate: 300 },
  ];

  const engineers = [];
  for (const eng of engineerData) {
    const user = await prisma.user.create({
      data: {
        clerkId: `seed_${eng.email.split("@")[0]}_clerk`,
        name: eng.name,
        email: eng.email,
        role: "ENGINEER",
        engineerProfile: {
          create: {
            status: "APPROVED",
            approvedAt: new Date(),
            yearsExperience: randomInt(5, 15),
            dayRate: eng.dayRate,
            engineerType: eng.type,
            testRate: eng.testRate ?? 0.45,
            labourPercentage: eng.labourPercentage ?? 0.40,
            coverageAreas: {
              create: eng.postcodes.map(p => ({ postcodePrefix: p, radiusKm: 25 })),
            },
            competencies: {
              create: services.map(s => ({ serviceId: s.id, experienceYears: randomInt(2, 10), certified: true })),
            },
          },
        },
      },
    });
    engineers.push(user);
  }

  console.log(`✅ Created ${engineers.length} engineers\n`);

  // =====================
  // CREATE CUSTOMERS & SITES (25 customers, ~100 sites)
  // =====================
  console.log("🏢 Creating customers and sites...");

  const customers = [];
  const allSites = [];
  let customerIndex = 0;

  for (const region of UK_REGIONS) {
    for (const postcode of region.postcodes) {
      const companyName = COMPANY_NAMES[customerIndex % COMPANY_NAMES.length];
      const firstName = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Rachel"][randomInt(0, 7)];
      const lastName = ["Smith", "Brown", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White"][randomInt(0, 7)];

      const customer = await prisma.user.create({
        data: {
          clerkId: `seed_customer_${customerIndex}_clerk`,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${customerIndex}@seed.complianceconnect.co.uk`,
          role: "CUSTOMER",
          companyName,
        },
      });
      customers.push(customer);

      // Create 3-5 sites per customer
      const numSites = randomInt(3, 5);
      for (let s = 0; s < numSites; s++) {
        const buildingType = randomElement(BUILDING_TYPES);
        const industryType = randomElement(INDUSTRY_TYPES);
        const siteName = s === 0 ? `${region.city} HQ` : `${region.city} ${["Branch", "Warehouse", "Store", "Office"][s % 4]} ${s}`;

        const site = await prisma.site.create({
          data: {
            userId: customer.id,
            name: siteName,
            address: `${randomInt(1, 200)} ${["High Street", "Business Park", "Industrial Estate", "Commercial Road", "Market Square"][s % 5]}, ${region.city}`,
            postcode: postcode.replace(/\d[A-Z]{2}$/, `${randomInt(1, 9)}${["AA", "AB", "BA", "BB"][s % 4]}`),
            profile: {
              create: {
                buildingType,
                industryType,
                floorArea: randomInt(200, 5000),
                numberOfFloors: randomInt(1, 5),
                estimatedPATItems: randomInt(20, 200),
                estimatedFireZones: randomInt(2, 12),
                estimatedEmergencyLights: randomInt(10, 50),
                estimatedCircuits: randomInt(8, 48),
                estimatedExtinguishers: randomInt(3, 15),
                typicalOccupancy: randomInt(10, 200),
                questionnaireComplete: true,
                completedAt: new Date(),
              },
            },
          },
        });
        allSites.push({ site, customer, buildingType });
      }
      customerIndex++;
    }
  }

  console.log(`✅ Created ${customers.length} customers and ${allSites.length} sites\n`);

  // =====================
  // CREATE 250 BOOKINGS
  // =====================
  console.log("📅 Creating 250 bookings...");

  const today = startOfDay(new Date());
  const bookingStatuses: BookingStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", // 40%
                                            "CONFIRMED", "CONFIRMED", // 20%
                                            "PENDING", "PENDING", // 15%
                                            "IN_PROGRESS", // 10%
                                            "CANCELLED", // 10%
                                            "CONFIRMED"]; // 5% provisional

  const bookings = [];
  for (let i = 0; i < 250; i++) {
    const { site, customer } = randomElement(allSites);
    const service = randomElement(services);
    const engineer = randomElement(engineers);
    const status = randomElement(bookingStatuses);

    // Date based on status
    let scheduledDate: Date;
    let isProvisional = false;

    if (status === "COMPLETED") {
      scheduledDate = subDays(today, randomInt(7, 90)); // Past 90 days
    } else if (status === "IN_PROGRESS") {
      scheduledDate = today;
    } else if (status === "CANCELLED") {
      scheduledDate = subDays(today, randomInt(1, 30));
    } else {
      scheduledDate = addDays(today, randomInt(1, 45)); // Future 45 days
      // 5% of future bookings are provisional
      if (Math.random() < 0.05) {
        isProvisional = true;
      }
    }

    const qty = randomInt(10, 100);
    const basePrice = Math.max(service.basePrice * qty, service.minCharge);
    const discountPercent = Math.random() < 0.3 ? randomInt(10, 25) : 0;
    const quotedPrice = basePrice * (1 - discountPercent / 100);

    const booking = await prisma.booking.create({
      data: {
        reference: generateBookingRef(),
        customerId: customer.id,
        siteId: site.id,
        serviceId: service.id,
        engineerId: status !== "PENDING" ? engineer.id : null,
        status,
        scheduledDate,
        slot: randomElement(["09:00", "10:00", "11:00", "13:00", "14:00"]),
        estimatedQty: qty,
        quotedPrice,
        originalPrice: basePrice,
        discountPercent,
        estimatedDuration: Math.ceil(service.baseMinutes + service.minutesPerUnit * qty),
        isProvisional,
        provisionalUntil: isProvisional ? addDays(today, 7) : null,
        startedAt: status === "IN_PROGRESS" || status === "COMPLETED" ? scheduledDate : null,
        completedAt: status === "COMPLETED" ? scheduledDate : null,
      },
    });
    bookings.push(booking);

    // Add assets for completed PAT testing bookings
    if (status === "COMPLETED" && service.slug === "pat-testing") {
      const assetCount = randomInt(5, 20);
      const assetData = [];
      for (let a = 0; a < assetCount; a++) {
        assetData.push({
          bookingId: booking.id,
          name: randomElement(["Kettle", "Monitor", "Laptop", "Printer", "Microwave", "Fan Heater", "Desk Lamp", "Phone Charger"]),
          location: randomElement(["Office 1", "Kitchen", "Meeting Room", "Reception", "Warehouse", "Server Room"]),
          status: Math.random() < 0.95 ? "PASS" : "FAIL",
          assetTag: `PAT-${randomInt(1000, 9999)}`,
        });
      }
      await prisma.asset.createMany({ data: assetData });
    }
  }

  console.log(`✅ Created ${bookings.length} bookings\n`);

  // =====================
  // CREATE COMPLIANCE REMINDERS
  // =====================
  console.log("🔔 Creating compliance reminders...");

  let remindersCreated = 0;
  for (const { site, customer } of allSites.slice(0, 50)) {
    for (const service of services.slice(0, 4)) {
      const lastTestDate = subDays(today, randomInt(30, 400));
      const intervalMonths = service.complianceIntervalMonths ?? 12;
      const nextDueDate = addDays(lastTestDate, intervalMonths * 30);
      const isOverdue = nextDueDate < today;
      const isDueSoon = !isOverdue && nextDueDate < addDays(today, 30);

      await prisma.complianceReminder.create({
        data: {
          customerId: customer.id,
          siteId: site.id,
          serviceId: service.id,
          lastTestDate,
          nextDueDate,
          autoRebookEnabled: Math.random() < 0.3,
          reminderSent30Days: isDueSoon || isOverdue,
          reminderSent7Days: isOverdue,
          reminderSentOverdue: isOverdue,
        },
      });
      remindersCreated++;
    }
  }

  console.log(`✅ Created ${remindersCreated} compliance reminders\n`);

  // =====================
  // SUMMARY
  // =====================
  console.log("═".repeat(50));
  console.log("📊 SEED SUMMARY");
  console.log("═".repeat(50));
  console.log(`Services:           ${services.length}`);
  console.log(`Service Bundles:    ${bundles.length}`);
  console.log(`Engineers:          ${engineers.length}`);
  console.log(`Customers:          ${customers.length}`);
  console.log(`Sites:              ${allSites.length}`);
  console.log(`Bookings:           ${bookings.length}`);
  console.log(`Compliance Reminders: ${remindersCreated}`);
  console.log("═".repeat(50));
  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
