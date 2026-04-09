import 'dotenv/config';
import { PrismaClient, Permission } from '@prisma/client';
import fs from 'fs';
import { execSync } from 'child_process';

const backupFile = './role-backup.json';

async function main() {
  console.log("====================================================");
  console.log("🚀 OpenTicket 0.4.0 Migration Utility 🚀");
  console.log("====================================================\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing in .env file.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[1/5] Connecting to database to check existing roles...");

    let backups: any[] = [];
    
    // Check if the 'role' column still exists on User table using raw SQL
    try {
      const usersWithOldRole: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='User' AND column_name='role';
      `);
      
      if (usersWithOldRole && usersWithOldRole.length > 0) {
        console.log("      Found legacy 'role' EnumArray. Extracting user roles...");
        const rolesQuery: any[] = await prisma.$queryRawUnsafe(`SELECT id, role FROM "User";`);
        backups = rolesQuery;

        fs.writeFileSync(backupFile, JSON.stringify(backups, null, 2));
        console.log(`      ✅ Successfully backed up ${backups.length} user roles to ${backupFile}.`);
      }
    } catch (e) {
      console.log("      Query inspection failed or column disappeared. Assumed already migrated.");
    }

    if (backups.length === 0) {
      if (fs.existsSync(backupFile)) {
         console.log("      Legacy 'role' column already dropped, but found local backup file. Resuming from backup.");
         backups = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      } else {
         console.log("      ✅ Legacy 'role' column is already migrated, and no backup file found. Safe to proceed.");
      }
    }

    console.log("\n[2/5] Running Prisma database schema migrations...");
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log("      ✅ Migrations applied successfully.");
    } catch (e) {
      console.error("❌ ERROR: Failed to apply database migrations.");
      process.exit(1);
    }

    console.log("\n[3/5] Seeding Global Custom Roles (Granular Permission Matrix)...");
    
    // Seed standard base roles
    const systemRoles = {
      'ADMIN': { name: 'System Administrator', isSystem: true, permissions: Object.values(Permission) },
      'SECOPS': { name: 'Security Operator', isSystem: true, permissions: [Permission.VIEW_DASHBOARD, Permission.VIEW_INCIDENTS_ALL, Permission.VIEW_INCIDENTS_ASSIGNED, Permission.VIEW_INCIDENTS_UNASSIGNED, Permission.CREATE_INCIDENTS, Permission.UPDATE_INCIDENTS_METADATA, Permission.ASSIGN_INCIDENTS_SELF, Permission.ASSIGN_INCIDENTS_OTHERS, Permission.UPDATE_INCIDENT_STATUS_RESOLVE, Permission.UPDATE_INCIDENT_STATUS_CLOSE, Permission.UPLOAD_INCIDENT_ATTACHMENTS, Permission.LINK_INCIDENT_TO_ASSET, Permission.ADD_COMMENTS, Permission.DELETE_OWN_COMMENTS, Permission.DELETE_ANY_COMMENTS, Permission.EXPORT_INCIDENTS, Permission.VIEW_ASSETS, Permission.CREATE_ASSETS, Permission.UPDATE_ASSETS, Permission.VIEW_VULNERABILITIES, Permission.CREATE_VULNERABILITIES, Permission.UPDATE_VULNERABILITIES, Permission.ASSIGN_VULNERABILITIES_SELF, Permission.LINK_VULN_TO_ASSET, Permission.UPLOAD_VULN_ATTACHMENTS] },
      'REPORTER': { name: 'Reporter (Standard User)', isSystem: true, permissions: [Permission.VIEW_DASHBOARD, Permission.VIEW_INCIDENTS_ASSIGNED, Permission.CREATE_INCIDENTS, Permission.ADD_COMMENTS, Permission.VIEW_ASSETS, Permission.VIEW_VULNERABILITIES] },
      'API_ACCESS': { name: 'Automation Bot (M2M)', isSystem: true, permissions: [Permission.ACCESS_API, Permission.ISSUE_API_TOKENS] }
    };

    const roleMap: Record<string, string> = {};

    for (const [oldRoleTag, roleData] of Object.entries(systemRoles)) {
      const dbRole = await prisma.customRole.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData
      });
      roleMap[oldRoleTag] = dbRole.id;
    }
    console.log("      ✅ Custom Roles synchronized in the database.");

    console.log("\n[4/5] Restoring user roles from legacy to new relation...");
    
    if (backups.length > 0) {
      let migratedCount = 0;
      for (const user of backups) {
        if (!user.role || !Array.isArray(user.role)) continue;

        const roleIdsToConnect = user.role
          .map((r: string) => roleMap[r])
          .filter(Boolean)
          .map((id: string) => ({ id }));

        if (roleIdsToConnect.length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              customRoles: {
                connect: roleIdsToConnect
              }
            }
          });
          migratedCount++;
        }
      }
      console.log(`      ✅ Successfully migrated privileges for ${migratedCount} users.`);
      
      // Cleanup backup file
      fs.unlinkSync(backupFile);
      console.log("      ✅ Backup artifact cleaned up.");
    } else {
      console.log("      ✅ No user restorations needed.");
    }

    console.log("\n[5/5] Rebuilding Prisma Client schemas...");
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log("      ✅ Prisma Client generated.");
    } catch (e) {
      console.error("❌ ERROR: Failed to generate Prisma client.");
      process.exit(1);
    }

    console.log("\n====================================================");
    console.log("🎉 Upgrade to v0.4.0 Complete! 🎉");
    console.log("You can now safely run 'npm run dev' or deploy to production.");
    console.log("====================================================\n");

  } catch (error) {
    console.error("❌ Migration failed with an exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
