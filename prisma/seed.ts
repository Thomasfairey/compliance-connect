import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create services
  const services = [
    {
      name: "PAT Testing",
      slug: "pat-testing",
      description:
        "Portable Appliance Testing ensures your electrical equipment is safe to use. Required for all businesses to comply with health and safety regulations.",
      basePrice: 1.5,
      minCharge: 75,
      unitName: "item",
      icon: "zap",
    },
    {
      name: "Fire Alarm Testing",
      slug: "fire-alarm-testing",
      description:
        "Comprehensive testing of fire alarm systems including detectors, call points, and control panels. Essential for fire safety compliance.",
      basePrice: 8,
      minCharge: 150,
      unitName: "zone",
      icon: "shield",
    },
    {
      name: "Emergency Lighting",
      slug: "emergency-lighting",
      description:
        "Testing of emergency lighting systems to ensure they function correctly during power failures. Required for all commercial premises.",
      basePrice: 5,
      minCharge: 120,
      unitName: "unit",
      icon: "file-check",
    },
    {
      name: "Fixed Wire Testing",
      slug: "fixed-wire-testing",
      description:
        "Electrical Installation Condition Report (EICR) for your premises. Tests the safety of fixed electrical systems including wiring and distribution boards.",
      basePrice: 25,
      minCharge: 250,
      unitName: "circuit",
      icon: "building-2",
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  console.log(`Created ${services.length} services`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
