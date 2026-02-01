import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create pool with proper SSL config for production
// Use more conservative settings for serverless
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 5, // Reduced for serverless (was 10)
  min: 0, // Allow pool to shrink to 0
  idleTimeoutMillis: 10000, // Close idle connections faster (was 30000)
  connectionTimeoutMillis: 5000, // Fail faster on connection issues (was 10000)
  allowExitOnIdle: true, // Allow process to exit when pool is idle
});

// Handle pool errors gracefully
pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected error on idle client:", err);
});

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Cache in both development AND production to avoid connection exhaustion
globalForPrisma.prisma = db;
globalForPrisma.pool = pool;
