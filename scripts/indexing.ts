import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;

async function main() {
  console.log("====================================================");
  console.log("🚀 OpenTicket Structural Indexing Utility 🚀");
  console.log("====================================================\n");

  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[1/1] Injecting High-Performance GIN Indices for Full-Text Search...");

    // Create GIN Index for Incident. Use IF NOT EXISTS to ensure idempotency.
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS incident_search_idx 
      ON "Incident" USING GIN (to_tsvector('english', title || ' ' || description));
    `);
    
    // Create GIN Index for Vulnerability
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS vuln_search_idx 
      ON "Vulnerability" USING GIN (to_tsvector('english', title || ' ' || description));
    `);

    console.log(`      ✅ Successfully built advanced text-search indexing matrices.`);

    console.log("\n====================================================");
    console.log("🎉 Indexing Operations Complete! 🎉");
    console.log("Database text-search speed increased dramatically using GIN indexes.");
    console.log("====================================================\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
