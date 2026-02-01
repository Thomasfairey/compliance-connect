import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const client = await pool.connect();

  try {
    // Get counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public."Service") as services,
        (SELECT COUNT(*) FROM public."EngineerProfile") as engineers,
        (SELECT COUNT(*) FROM public."User" WHERE role = 'CUSTOMER') as customers,
        (SELECT COUNT(*) FROM public."Site") as sites,
        (SELECT COUNT(*) FROM public."Booking") as total_bookings,
        (SELECT COUNT(*) FROM public."Booking" WHERE status = 'PENDING') as pending,
        (SELECT COUNT(*) FROM public."Booking" WHERE status = 'CONFIRMED') as confirmed,
        (SELECT COUNT(*) FROM public."Booking" WHERE status = 'COMPLETED') as completed,
        (SELECT COUNT(*) FROM public."Booking" WHERE status = 'IN_PROGRESS') as in_progress
    `);

    const c = counts.rows[0];
    console.log("══════════════════════════════════════════════════");
    console.log("📊 DATABASE VERIFICATION - Admin Dashboard Data");
    console.log("══════════════════════════════════════════════════");
    console.log("Services:          ", c.services);
    console.log("Engineers:         ", c.engineers);
    console.log("Customers:         ", c.customers);
    console.log("Sites:             ", c.sites);
    console.log("Total Bookings:    ", c.total_bookings);
    console.log("  └─ Pending:      ", c.pending);
    console.log("  └─ Confirmed:    ", c.confirmed);
    console.log("  └─ In Progress:  ", c.in_progress);
    console.log("  └─ Completed:    ", c.completed);

    // Get recent bookings
    const bookings = await client.query(`
      SELECT b.reference, s.name as service_name, u."companyName", b.status, b."scheduledDate"
      FROM public."Booking" b
      JOIN public."Service" s ON b."serviceId" = s.id
      JOIN public."User" u ON b."customerId" = u.id
      ORDER BY b."createdAt" DESC
      LIMIT 10
    `);

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 RECENT BOOKINGS (Top 10)");
    console.log("═══════════════════════════════════════════════════");
    for (const b of bookings.rows) {
      const date = new Date(b.scheduledDate).toLocaleDateString('en-GB');
      console.log(`${b.reference} | ${b.service_name.substring(0,18).padEnd(18)} | ${(b.companyName || '').substring(0,18).padEnd(18)} | ${b.status.padEnd(12)} | ${date}`);
    }

    // Get engineers
    const engineers = await client.query(`
      SELECT u."firstName", u."lastName", e."engineerType", e.status
      FROM public."EngineerProfile" e
      JOIN public."User" u ON e."userId" = u.id
      ORDER BY u."lastName"
    `);

    console.log("\n═══════════════════════════════════════════════════");
    console.log("👷 ENGINEERS");
    console.log("═══════════════════════════════════════════════════");
    for (const e of engineers.rows) {
      const name = `${e.firstName || ''} ${e.lastName || ''}`;
      console.log(`${name.padEnd(25)} | ${(e.engineerType || '').padEnd(15)} | ${e.status}`);
    }

    // Get services
    const services = await client.query(`
      SELECT name, category, "basePrice", "isActive"
      FROM public."Service"
      ORDER BY category, name
    `);

    console.log("\n═══════════════════════════════════════════════════");
    console.log("🔧 SERVICES");
    console.log("═══════════════════════════════════════════════════");
    for (const s of services.rows) {
      const price = `£${parseFloat(s.basePrice).toFixed(2)}`;
      const active = s.isActive ? "Active" : "Inactive";
      console.log(`${s.name.padEnd(25)} | ${(s.category || '').padEnd(15)} | ${price.padEnd(10)} | ${active}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check();
