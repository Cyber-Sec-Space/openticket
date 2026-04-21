import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const backupFile = './role-backup.json';
const dbUrl = process.env.DATABASE_URL;

async function main() {
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing in .env file.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[Backup 0.4.0] Checking for legacy 'role' column in User table...");

    // Check if the 'role' column still exists on User table using raw SQL
    const usersWithOldRole: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='User' AND column_name='role';
    `);
    
    if (usersWithOldRole && usersWithOldRole.length > 0) {
      console.log("      Found legacy 'role' EnumArray. Extracting user roles...");
      const rolesQuery: any[] = await prisma.$queryRawUnsafe(`SELECT id, role FROM "User";`);
      
      fs.writeFileSync(backupFile, JSON.stringify(rolesQuery, null, 2));
      console.log(`      ✅ Successfully backed up ${rolesQuery.length} user roles to ${backupFile}.`);
    } else {
      console.log("      [SKIPPED] Legacy 'role' column does not exist. No backup needed.");
    }
  } catch (e) {
    console.log("      [SKIPPED] Query inspection failed. Assuming column dropped or unsupported environment.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
