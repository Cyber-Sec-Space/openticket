import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;

async function main() {
  console.log("====================================================");
  console.log("🚀 OpenTicket 1.0.0-rc.1 Migration Utility 🚀");
  console.log("====================================================\n");

  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing in .env file.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[1/2] Fetching Global System Settings...");

    const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
    
    if (!settings) {
      console.log("      [SKIPPED] No global settings found. System likely not initialized.");
      console.log("🎉 Safe to proceed.\n");
      return;
    }

    console.log("[2/2] Retroactively calculating missing SLA target dates for legacy datasets...");

    // Incidents
    const updatedIncidents = await prisma.$executeRawUnsafe(`
      UPDATE "Incident"
      SET "targetSlaDate" = "createdAt" + (
        CASE "severity"::text
          WHEN 'CRITICAL' THEN ${settings.slaCriticalHours}::int * INTERVAL '1 hour'
          WHEN 'HIGH'     THEN ${settings.slaHighHours}::int * INTERVAL '1 hour'
          WHEN 'MEDIUM'   THEN ${settings.slaMediumHours}::int * INTERVAL '1 hour'
          WHEN 'LOW'      THEN ${settings.slaLowHours}::int * INTERVAL '1 hour'
          WHEN 'INFO'     THEN ${settings.slaInfoHours}::int * INTERVAL '1 hour'
        END
      )
      WHERE "status"::text IN ('NEW', 'IN_PROGRESS', 'PENDING_INFO')
      AND "targetSlaDate" IS NULL
    `);

    // Vulnerabilities
    const updatedVulns = await prisma.$executeRawUnsafe(`
      UPDATE "Vulnerability"
      SET "targetSlaDate" = "createdAt" + (
        CASE "severity"::text
          WHEN 'CRITICAL' THEN ${settings.vulnSlaCriticalHours}::int * INTERVAL '1 hour'
          WHEN 'HIGH'     THEN ${settings.vulnSlaHighHours}::int * INTERVAL '1 hour'
          WHEN 'MEDIUM'   THEN ${settings.vulnSlaMediumHours}::int * INTERVAL '1 hour'
          WHEN 'LOW'      THEN ${settings.vulnSlaLowHours}::int * INTERVAL '1 hour'
          WHEN 'INFO'     THEN ${settings.vulnSlaInfoHours}::int * INTERVAL '1 hour'
        END
      )
      WHERE "status"::text IN ('OPEN', 'MITIGATED')
      AND "targetSlaDate" IS NULL
    `);

    console.log(`      ✅ Updated ${updatedIncidents} legacy incidents with accurate SLA targets.`);
    console.log(`      ✅ Updated ${updatedVulns} legacy vulnerabilities with accurate SLA targets.`);

    console.log("\n====================================================");
    console.log("🎉 Upgrade to v1.0.0-rc.1 Complete! 🎉");
    console.log("Enterprise SLA engine structural integrity achieved.");
    console.log("====================================================\n");

  } catch (error) {
    console.error("❌ Migration failed with an exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
