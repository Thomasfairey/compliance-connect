import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, BuildingType, IndustryType, BookingStatus, EngineerType } from "@prisma/client";
import { addDays, subDays, startOfDay } from "date-fns";
import bcrypt from "bcryptjs";

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

// UK Cities with realistic postcodes and centre coordinates
const UK_REGIONS = [
  // London - 10 customers
  { city: "London", lat: 51.5074, lng: -0.1278, postcodes: ["SW1A 1AA", "EC2A 1NT", "W1D 3QF", "SE1 9SG", "NW1 6XE", "E1 6AN", "N1 9GU", "WC2N 5DU", "W2 1JB", "SW3 1AA"] },
  // Manchester - 3 customers
  { city: "Manchester", lat: 53.4808, lng: -2.2426, postcodes: ["M1 2WD", "M2 5DB", "M4 1HQ"] },
  // Birmingham - 3 customers
  { city: "Birmingham", lat: 52.4862, lng: -1.8904, postcodes: ["B1 1RS", "B2 4QA", "B3 3HJ"] },
  // Leeds - 2 customers
  { city: "Leeds", lat: 53.8008, lng: -1.5491, postcodes: ["LS1 4AP", "LS2 7EW"] },
  // Edinburgh - 2 customers
  { city: "Edinburgh", lat: 55.9533, lng: -3.1883, postcodes: ["EH1 1YS", "EH2 4RG"] },
  // Bristol - 2 customers
  { city: "Bristol", lat: 51.4545, lng: -2.5879, postcodes: ["BS1 4QA", "BS2 0JA"] },
  // Cardiff - 1 customer
  { city: "Cardiff", lat: 51.4816, lng: -3.1791, postcodes: ["CF10 1EP"] },
  // Newcastle - 1 customer
  { city: "Newcastle", lat: 54.9783, lng: -1.6178, postcodes: ["NE1 4ST"] },
  // Southampton - 1 customer
  { city: "Southampton", lat: 50.9097, lng: -1.4044, postcodes: ["SO14 2AQ"] },
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
  await prisma.allocationScoreLog.deleteMany({});
  await prisma.siteProfile.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.customerMetrics.deleteMany({});
  await prisma.pricingRule.deleteMany({});
  await prisma.areaIntelligence.deleteMany({});

  // Delete seed users
  await prisma.user.deleteMany({
    where: {
      email: { contains: "@seed.complianceconnect.co.uk" },
    },
  });

  // Delete demo users
  await prisma.user.deleteMany({
    where: {
      email: { in: ["admin@demo.com", "customer@demo.com", "engineer@demo.com"] },
    },
  });

  console.log("✅ Cleanup complete!\n");

  // =====================
  // CREATE DEMO USERS
  // =====================
  console.log("👤 Creating demo users...");

  const hashedPassword = await bcrypt.hash("demo123", 10);

  await prisma.user.create({
    data: {
      email: "admin@demo.com",
      password: hashedPassword,
      name: "Demo Admin",
      role: "ADMIN",
      companyName: "Compliance Connect",
    },
  });

  const demoCustomer = await prisma.user.create({
    data: {
      email: "customer@demo.com",
      password: hashedPassword,
      name: "Demo Customer",
      role: "CUSTOMER",
      companyName: "Acme Corporation",
    },
  });

  const demoEngineer = await prisma.user.create({
    data: {
      email: "engineer@demo.com",
      password: hashedPassword,
      name: "Demo Engineer",
      role: "ENGINEER",
      engineerProfile: {
        create: {
          status: "APPROVED",
          approvedAt: new Date(),
          yearsExperience: 5,
          engineerType: "PAT_TESTER",
          dayRate: 280,
          testRate: 0.45,
        },
      },
    },
  });

  console.log("✅ Demo users created:");
  console.log("   - admin@demo.com (password: demo123)");
  console.log("   - customer@demo.com (password: demo123)");
  console.log("   - engineer@demo.com (password: demo123)\n");

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
  // SETUP DEMO USERS (add competencies and sites)
  // =====================
  console.log("🔧 Setting up demo user data...");

  // Add competencies to demo engineer
  const demoEngineerProfile = await prisma.engineerProfile.findUnique({
    where: { userId: demoEngineer.id },
  });

  if (demoEngineerProfile) {
    await prisma.engineerCompetency.createMany({
      data: services.map(s => ({
        engineerProfileId: demoEngineerProfile.id,
        serviceId: s.id,
        experienceYears: 5,
        certified: true,
      })),
    });

    await prisma.engineerCoverageArea.createMany({
      data: [
        { engineerProfileId: demoEngineerProfile.id, postcodePrefix: "SW", radiusKm: 25 },
        { engineerProfileId: demoEngineerProfile.id, postcodePrefix: "W", radiusKm: 25 },
        { engineerProfileId: demoEngineerProfile.id, postcodePrefix: "EC", radiusKm: 25 },
        { engineerProfileId: demoEngineerProfile.id, postcodePrefix: "WC", radiusKm: 25 },
      ],
    });
  }

  // Create a site for demo customer
  await prisma.site.create({
    data: {
      userId: demoCustomer.id,
      name: "Acme HQ",
      address: "123 Business Street, London",
      postcode: "SW1A 1AA",
      latitude: 51.5014,
      longitude: -0.1419,
      profile: {
        create: {
          buildingType: "OFFICE",
          industryType: "TECHNOLOGY",
          floorArea: 500,
          numberOfFloors: 2,
          estimatedPATItems: 50,
          estimatedFireZones: 4,
          estimatedEmergencyLights: 20,
          estimatedCircuits: 12,
          estimatedExtinguishers: 5,
          typicalOccupancy: 30,
          questionnaireComplete: true,
          completedAt: new Date(),
        },
      },
    },
  });

  // Create additional site for demo customer
  const demoSite2 = await prisma.site.create({
    data: {
      userId: demoCustomer.id,
      name: "Acme Warehouse",
      address: "45 Industrial Road, London",
      postcode: "SW1A 2AA",
      latitude: 51.4952,
      longitude: -0.1351,
      profile: {
        create: {
          buildingType: "WAREHOUSE",
          industryType: "TECHNOLOGY",
          floorArea: 1200,
          numberOfFloors: 1,
          estimatedPATItems: 80,
          estimatedFireZones: 6,
          estimatedEmergencyLights: 30,
          estimatedCircuits: 20,
          estimatedExtinguishers: 8,
          typicalOccupancy: 15,
          questionnaireComplete: true,
          completedAt: new Date(),
        },
      },
    },
  });

  console.log("✅ Demo user setup complete\n");

  // =====================
  // CREATE PRICING RULES (Scheduling V2)
  // =====================
  console.log("💰 Creating pricing rules...");

  const pricingRules = await Promise.all([
    prisma.pricingRule.create({
      data: {
        name: "Cluster Discount",
        slug: "cluster-discount",
        description: "Discount when engineer already has nearby jobs on the same day",
        type: "cluster",
        enabled: true,
        priority: 1,
        config: {
          cluster: {
            radiusKm: 5,
            minJobs: 1,
            discountPercent: 10,
          },
        },
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: "Urgency Premium",
        slug: "urgency-premium",
        description: "Premium for last-minute bookings (less than 2 days notice)",
        type: "urgency",
        enabled: true,
        priority: 2,
        config: {
          urgency: {
            daysThreshold: 2,
            premiumPercent: 15,
          },
        },
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: "Off-Peak Discount",
        slug: "offpeak-discount",
        description: "Discount for Monday and Tuesday bookings (typically slower days)",
        type: "offpeak",
        enabled: true,
        priority: 3,
        config: {
          offpeak: {
            days: [1, 2], // Monday, Tuesday
            discountPercent: 5,
          },
        },
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: "Flexibility Discount",
        slug: "flex-discount",
        description: "Discount for customers flexible on scheduling dates",
        type: "flex",
        enabled: true,
        priority: 4,
        config: {
          flex: {
            daysFlexible: 7,
            discountPercent: 7,
          },
        },
      },
    }),
    prisma.pricingRule.create({
      data: {
        name: "Loyalty Discount",
        slug: "loyalty-discount",
        description: "Discount for repeat customers with 5+ completed bookings",
        type: "loyalty",
        enabled: true,
        priority: 5,
        config: {
          loyalty: {
            minBookings: 5,
            discountPercent: 5,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${pricingRules.length} pricing rules\n`);

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

        // Offset lat/lng slightly for each site (within ~2km of city centre)
        const siteLat = region.lat + (Math.random() - 0.5) * 0.03;
        const siteLng = region.lng + (Math.random() - 0.5) * 0.05;

        const site = await prisma.site.create({
          data: {
            userId: customer.id,
            name: siteName,
            address: `${randomInt(1, 200)} ${["High Street", "Business Park", "Industrial Estate", "Commercial Road", "Market Square"][s % 5]}, ${region.city}`,
            postcode: postcode.replace(/\d[A-Z]{2}$/, `${randomInt(1, 9)}${["AA", "AB", "BA", "BB"][s % 4]}`),
            latitude: siteLat,
            longitude: siteLng,
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
  // CREATE BOOKINGS - Dense in Feb, tapering through March/April 2026
  // =====================
  console.log("📅 Creating bookings with realistic Feb-April 2026 distribution...");

  const today = startOfDay(new Date());

  // Helper to check if a date is a weekday (Mon-Fri)
  function isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
  }

  // Generate working days for Feb, March, April 2026
  function getWorkingDays(year: number, month: number): Date[] {
    const days: Date[] = [];
    const date = new Date(year, month - 1, 1); // month is 0-indexed
    while (date.getMonth() === month - 1) {
      if (isWeekday(date)) {
        days.push(new Date(date));
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  const febDays = getWorkingDays(2026, 2);  // February 2026
  const marDays = getWorkingDays(2026, 3);  // March 2026
  const aprDays = getWorkingDays(2026, 4);  // April 2026

  console.log(`  Feb working days: ${febDays.length}, Mar: ${marDays.length}, Apr: ${aprDays.length}`);

  const bookings = [];
  const slots = ["AM", "PM"];

  // Helper to create a booking
  async function createBooking(scheduledDate: Date, status: BookingStatus, isProvisional: boolean = false) {
    const { site, customer } = randomElement(allSites);
    const service = randomElement(services);
    const engineer = randomElement(engineers);

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
        slot: randomElement(slots),
        estimatedQty: qty,
        quotedPrice,
        originalPrice: basePrice,
        discountPercent,
        estimatedDuration: Math.ceil(service.baseMinutes + service.minutesPerUnit * qty),
        isProvisional,
        provisionalUntil: isProvisional ? addDays(scheduledDate, 7) : null,
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

    return booking;
  }

  // February 2026: 8-12 bookings per working day (all COMPLETED since it's past)
  console.log("  Creating February bookings (high density)...");
  for (const day of febDays) {
    const bookingsPerDay = randomInt(8, 12);
    for (let i = 0; i < bookingsPerDay; i++) {
      await createBooking(day, "COMPLETED");
    }
  }
  console.log(`  ✓ February: ${febDays.length * 10} avg bookings`);

  // March 2026: 4-6 bookings per working day (mix of COMPLETED and future statuses)
  console.log("  Creating March bookings (medium density)...");
  for (const day of marDays) {
    const bookingsPerDay = randomInt(4, 6);
    const isPast = day < today;
    for (let i = 0; i < bookingsPerDay; i++) {
      if (isPast) {
        // Past dates: mostly COMPLETED, some CANCELLED
        const status = Math.random() < 0.9 ? "COMPLETED" : "CANCELLED";
        await createBooking(day, status);
      } else if (day.toDateString() === today.toDateString()) {
        // Today: IN_PROGRESS or CONFIRMED
        const status = Math.random() < 0.5 ? "IN_PROGRESS" : "CONFIRMED";
        await createBooking(day, status);
      } else {
        // Future dates: CONFIRMED or PENDING, some provisional
        const isProvisional = Math.random() < 0.15;
        const status = Math.random() < 0.7 ? "CONFIRMED" : "PENDING";
        await createBooking(day, status, isProvisional);
      }
    }
  }
  console.log(`  ✓ March: ${marDays.length * 5} avg bookings`);

  // April 2026: 2-4 bookings per working day (mostly future)
  console.log("  Creating April bookings (low density)...");
  for (const day of aprDays) {
    const bookingsPerDay = randomInt(2, 4);
    const isPast = day < today;
    for (let i = 0; i < bookingsPerDay; i++) {
      if (isPast) {
        const status = Math.random() < 0.85 ? "COMPLETED" : "CANCELLED";
        await createBooking(day, status);
      } else if (day.toDateString() === today.toDateString()) {
        const status = Math.random() < 0.5 ? "IN_PROGRESS" : "CONFIRMED";
        await createBooking(day, status);
      } else {
        // Future: more pending/provisional as we go further out
        const isProvisional = Math.random() < 0.25;
        const status = Math.random() < 0.5 ? "CONFIRMED" : "PENDING";
        await createBooking(day, status, isProvisional);
      }
    }
  }
  console.log(`  ✓ April: ${aprDays.length * 3} avg bookings`);

  // Also add some historical data from Jan 2026 and Dec 2025 for trends
  console.log("  Creating historical bookings (Dec-Jan)...");
  const janDays = getWorkingDays(2026, 1);
  const decDays = getWorkingDays(2025, 12);

  for (const day of janDays) {
    const bookingsPerDay = randomInt(5, 8);
    for (let i = 0; i < bookingsPerDay; i++) {
      await createBooking(day, "COMPLETED");
    }
  }

  for (const day of decDays) {
    const bookingsPerDay = randomInt(3, 6);
    for (let i = 0; i < bookingsPerDay; i++) {
      await createBooking(day, "COMPLETED");
    }
  }
  console.log(`  ✓ Jan: ${janDays.length * 6} avg, Dec: ${decDays.length * 4} avg bookings`);

  console.log(`✅ Created ${bookings.length} total bookings\n`);

  // =====================
  // CREATE DEMO ENGINEER BOOKINGS (for busy schedule demo)
  // =====================
  console.log("🛠️ Creating demo engineer's busy schedule...");

  // Get demo engineer's profile
  const demoEngProfile = await prisma.engineerProfile.findUnique({
    where: { userId: demoEngineer.id },
  });

  // Get demo customer's sites
  const demoCustomerSites = await prisma.site.findMany({
    where: { userId: demoCustomer.id },
  });

  // Helper function for demo bookings
  async function createDemoEngineerBooking(
    date: Date,
    slot: string,
    status: BookingStatus,
    serviceIndex: number,
    siteIndex: number
  ) {
    const service = services[serviceIndex % services.length];
    const site = demoCustomerSites[siteIndex % demoCustomerSites.length];
    const qty = randomInt(30, 80);
    const basePrice = Math.max(service.basePrice * qty, service.minCharge);

    return prisma.booking.create({
      data: {
        reference: generateBookingRef(),
        customerId: demoCustomer.id,
        siteId: site.id,
        serviceId: service.id,
        engineerId: demoEngineer.id,
        status,
        scheduledDate: date,
        slot,
        estimatedQty: qty,
        quotedPrice: basePrice * 0.9, // 10% discount
        originalPrice: basePrice,
        discountPercent: 10,
        estimatedDuration: Math.ceil(service.baseMinutes + service.minutesPerUnit * qty),
        enRouteAt: ["EN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETED"].includes(status) ? date : null,
        startedAt: status === "IN_PROGRESS" || status === "COMPLETED" || status === "ON_SITE" ? date : null,
        completedAt: status === "COMPLETED" ? date : null,
        arrivedAt: status === "ON_SITE" || status === "IN_PROGRESS" || status === "COMPLETED" ? date : null,
      },
    });
  }

  // Today's jobs for demo engineer (make it look busy!)
  const demoToday = startOfDay(new Date());

  // Morning job - EN_ROUTE (currently tracking / driving)
  await createDemoEngineerBooking(demoToday, "AM", "EN_ROUTE", 0, 0);

  // Another morning job - CONFIRMED (next up)
  await createDemoEngineerBooking(demoToday, "AM", "CONFIRMED", 1, 1);

  // Afternoon jobs - ON_SITE (arrived, detecting activity) and CONFIRMED
  await createDemoEngineerBooking(demoToday, "PM", "ON_SITE", 2, 0);
  await createDemoEngineerBooking(demoToday, "PM", "CONFIRMED", 0, 1);

  // Tomorrow's jobs
  const tomorrow = addDays(demoToday, 1);
  await createDemoEngineerBooking(tomorrow, "AM", "CONFIRMED", 0, 0);
  await createDemoEngineerBooking(tomorrow, "AM", "CONFIRMED", 3, 1);
  await createDemoEngineerBooking(tomorrow, "PM", "CONFIRMED", 1, 0);

  // Day after tomorrow
  const dayAfter = addDays(demoToday, 2);
  await createDemoEngineerBooking(dayAfter, "AM", "CONFIRMED", 4, 0);
  await createDemoEngineerBooking(dayAfter, "PM", "CONFIRMED", 0, 1);
  await createDemoEngineerBooking(dayAfter, "PM", "CONFIRMED", 2, 0);

  // Next week jobs
  for (let i = 3; i <= 7; i++) {
    const futureDate = addDays(demoToday, i);
    // Skip weekends
    if (futureDate.getDay() !== 0 && futureDate.getDay() !== 6) {
      await createDemoEngineerBooking(futureDate, "AM", "CONFIRMED", i % 5, i % 2);
      await createDemoEngineerBooking(futureDate, "PM", "CONFIRMED", (i + 1) % 5, (i + 1) % 2);
    }
  }

  // Yesterday's completed jobs (for history)
  const yesterday = subDays(demoToday, 1);
  await createDemoEngineerBooking(yesterday, "AM", "COMPLETED", 0, 0);
  await createDemoEngineerBooking(yesterday, "PM", "COMPLETED", 1, 1);

  // Last week completed jobs
  for (let i = 2; i <= 5; i++) {
    const pastDate = subDays(demoToday, i);
    if (pastDate.getDay() !== 0 && pastDate.getDay() !== 6) {
      await createDemoEngineerBooking(pastDate, "AM", "COMPLETED", i % 5, 0);
      await createDemoEngineerBooking(pastDate, "PM", "COMPLETED", (i + 1) % 5, 1);
    }
  }

  console.log("✅ Created demo engineer's schedule with 20+ jobs\n");

  // =====================
  // CREATE AVAILABLE (UNASSIGNED) JOBS FOR THIS WEEK
  // =====================
  console.log("📋 Creating available jobs for engineers...");

  const availableJobCount = 8;
  for (let i = 0; i < availableJobCount; i++) {
    const dayOffset = randomInt(0, 6); // This week
    let availDate = addDays(demoToday, dayOffset);
    // Skip weekends
    if (availDate.getDay() === 0) availDate = addDays(availDate, 1);
    if (availDate.getDay() === 6) availDate = addDays(availDate, 2);

    const { site, customer } = randomElement(allSites);
    const service = randomElement(services);
    const qty = randomInt(15, 80);
    const basePrice = Math.max(service.basePrice * qty, service.minCharge);

    await prisma.booking.create({
      data: {
        reference: generateBookingRef(),
        customerId: customer.id,
        siteId: site.id,
        serviceId: service.id,
        engineerId: null, // Unassigned!
        status: "PENDING",
        scheduledDate: availDate,
        slot: randomElement(slots),
        estimatedQty: qty,
        quotedPrice: basePrice,
        originalPrice: basePrice,
        discountPercent: 0,
        estimatedDuration: Math.ceil(service.baseMinutes + service.minutesPerUnit * qty),
      },
    });
  }

  console.log(`✅ Created ${availableJobCount} available jobs for this week\n`);

  // =====================
  // CREATE NOTIFICATIONS
  // =====================
  console.log("🔔 Creating notifications...");

  // Notifications for demo customer
  const customerNotifications = [
    { type: "BOOKING_UPDATE", title: "Engineer en route", body: "James Mitchell is on the way to Acme HQ for your PAT Testing appointment.", hoursAgo: 1 },
    { type: "BOOKING_UPDATE", title: "Job started", body: "PAT Testing has started at Acme HQ. Estimated completion: 3 hours.", hoursAgo: 0.5 },
    { type: "BOOKING_UPDATE", title: "Job completed", body: "Emergency Lighting testing at Acme Warehouse is complete. Certificate available.", hoursAgo: 24 },
    { type: "BOOKING_UPDATE", title: "Engineer arrived", body: "Mike Thompson has arrived at Acme Warehouse for Fixed Wire Testing.", hoursAgo: 48 },
    { type: "REMINDER", title: "PAT Testing due in 28 days", body: "Your annual PAT Testing at Acme HQ is due soon. Book now to stay compliant.", hoursAgo: 72 },
    { type: "BOOKING_UPDATE", title: "Booking confirmed", body: "Your Fire Alarm Testing at Acme HQ has been confirmed for next Tuesday AM.", hoursAgo: 96 },
  ];

  for (const n of customerNotifications) {
    await prisma.notification.create({
      data: {
        userId: demoCustomer.id,
        type: n.type,
        title: n.title,
        body: n.body,
        actionUrl: "/bookings",
        readAt: n.hoursAgo > 48 ? new Date() : null, // Older ones are read
        createdAt: new Date(Date.now() - n.hoursAgo * 3600000),
      },
    });
  }

  // Notifications for demo engineer
  const engineerNotifications = [
    { type: "NEW_JOB", title: "New job assigned", body: "PAT Testing at Acme HQ has been assigned to you for today.", hoursAgo: 8 },
    { type: "SCHEDULE_CHANGE", title: "Schedule updated", body: "Your afternoon job at Acme Warehouse has been moved to PM slot.", hoursAgo: 24 },
    { type: "NEW_JOB", title: "New job available", body: "Fire Alarm Testing in SW1 is available for tomorrow. Tap to accept.", hoursAgo: 12 },
    { type: "REMINDER", title: "Tomorrow's schedule", body: "You have 3 jobs scheduled for tomorrow. First job: 8:00 AM at Acme HQ.", hoursAgo: 16 },
    { type: "BOOKING_UPDATE", title: "Job completed confirmation", body: "PAT Testing at Acme Warehouse marked as complete. Certificate generated.", hoursAgo: 48 },
  ];

  for (const n of engineerNotifications) {
    await prisma.notification.create({
      data: {
        userId: demoEngineer.id,
        type: n.type,
        title: n.title,
        body: n.body,
        actionUrl: "/engineer",
        readAt: n.hoursAgo > 24 ? new Date() : null,
        createdAt: new Date(Date.now() - n.hoursAgo * 3600000),
      },
    });
  }

  console.log(`✅ Created ${customerNotifications.length + engineerNotifications.length} notifications\n`);

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
  // CREATE CUSTOMER METRICS (Scheduling V2)
  // =====================
  console.log("📈 Calculating customer metrics...");

  let metricsCreated = 0;
  for (const customer of customers) {
    // Get booking stats for this customer
    const customerBookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      select: { status: true, quotedPrice: true, createdAt: true, completedAt: true },
    });

    const completed = customerBookings.filter(b => b.status === "COMPLETED");
    const cancelled = customerBookings.filter(b => b.status === "CANCELLED");
    const totalRevenue = completed.reduce((sum, b) => sum + (b.quotedPrice ?? 0), 0);

    const revenueScore = Math.min(100, (totalRevenue / 10000) * 100);
    const frequencyScore = Math.min(100, completed.length * 10);
    const cancellationRate = customerBookings.length > 0 ? cancelled.length / customerBookings.length : 0;
    const reliabilityScore = Math.max(0, 100 - cancellationRate * 200);
    const ltvScore = revenueScore * 0.4 + frequencyScore * 0.3 + reliabilityScore * 0.3;

    await prisma.customerMetrics.create({
      data: {
        userId: customer.id,
        totalBookings: customerBookings.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        totalRevenue,
        averageOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        firstBookingAt: customerBookings[0]?.createdAt,
        lastBookingAt: completed[completed.length - 1]?.completedAt,
        ltvScore,
        reliabilityScore,
        frequencyScore,
      },
    });
    metricsCreated++;
  }

  console.log(`✅ Created ${metricsCreated} customer metrics\n`);

  // =====================
  // SUMMARY
  // =====================
  console.log("═".repeat(50));
  console.log("📊 SEED SUMMARY");
  console.log("═".repeat(50));
  console.log(`Services:             ${services.length}`);
  console.log(`Pricing Rules:        ${pricingRules.length}`);
  console.log(`Service Bundles:      ${bundles.length}`);
  console.log(`Engineers:            ${engineers.length}`);
  console.log(`Customers:            ${customers.length}`);
  console.log(`Customer Metrics:     ${metricsCreated}`);
  console.log(`Sites:                ${allSites.length} (all with lat/lng)`);
  console.log(`Bookings:             ${bookings.length}`);
  console.log(`Available Jobs:       8 (unassigned this week)`);
  console.log(`Notifications:        11 (6 customer + 5 engineer)`);
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
