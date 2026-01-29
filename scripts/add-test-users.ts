import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create engineer user in database
  const engineer = await prisma.user.upsert({
    where: { clerkId: "user_38vamNQljerWpwmWJqj1bP1SYkx" },
    update: { role: "ENGINEER" },
    create: {
      clerkId: "user_38vamNQljerWpwmWJqj1bP1SYkx",
      email: "test.engineer@demo.com",
      name: "Test Engineer",
      role: "ENGINEER",
    },
  });
  console.log("Engineer created:", engineer.id);

  // Create engineer profile
  await prisma.engineerProfile.upsert({
    where: { userId: engineer.id },
    update: { status: "APPROVED" },
    create: {
      userId: engineer.id,
      status: "APPROVED",
      approvedAt: new Date(),
      yearsExperience: 5,
      bio: "Test engineer for demo purposes",
    },
  });
  console.log("Engineer profile created");

  // Create admin user in database
  const admin = await prisma.user.upsert({
    where: { clerkId: "user_38vanO1saLynbn3hqdJ8sKa51bx" },
    update: { role: "ADMIN" },
    create: {
      clerkId: "user_38vanO1saLynbn3hqdJ8sKa51bx",
      email: "test.admin@demo.com",
      name: "Test Admin",
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.id);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => pool.end())
  .catch(console.error);
