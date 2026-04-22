import 'dotenv/config';
import { PrismaClient, Permission } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;

async function main() {
  console.log("====================================================");
  console.log("🚀 OpenTicket 0.5.2 Migration Utility 🚀");
  console.log("====================================================\n");

  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing in .env file.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[1/2] Checking if migration is already applied...");

    const adminRole = await prisma.customRole.findUnique({ where: { name: 'System Administrator' } });
    if (adminRole && adminRole.permissions.includes(Permission.ACCESS_API)) {
       console.log("      [SKIPPED] System Administrator already has ACCESS_API permission.");
       console.log("🎉 Upgrade to v0.5.2 already applied. Safe to proceed.\n");
       return;
    }

    console.log("[2/2] Applying API metadata to custom roles...");

    const allRoles = await prisma.customRole.findMany();

    const apiAdminPerms = [
      Permission.ACCESS_API,
      Permission.VIEW_API_TOKENS,
      Permission.ISSUE_API_TOKENS,
      Permission.REVOKE_API_TOKENS
    ];

    let updatedRoles = 0;

    for (const role of allRoles) {
      let modified = false;
      const newPermissions = [...role.permissions];

      // Give Administrators or DevOps Engineers full API token management capabilities
      const hasAdminLevelAccess = role.permissions.includes(Permission.MANAGE_INTEGRATIONS) || role.name === 'System Administrator';
      
      if (hasAdminLevelAccess) {
        for (const p of apiAdminPerms) {
          if (!newPermissions.includes(p)) {
            newPermissions.push(p);
            modified = true;
          }
        }
      }

      if (modified) {
        await prisma.customRole.update({
          where: { id: role.id },
          data: {
            permissions: newPermissions
          }
        });
        updatedRoles++;
        console.log(`      -> Upgraded API permissions for role: ${role.name}`);
      }
    }

    if (updatedRoles === 0) {
       console.log("      ✅ All roles already contain requested API permissions.");
    } else {
       console.log(`      ✅ Successfully upgraded ${updatedRoles} roles with robust API Token Matrix boundaries.`);
    }

    console.log("\n====================================================");
    console.log("🎉 Upgrade to v0.5.2 Complete! 🎉");
    console.log("Secure M2M Edge communication boundaries established.");
    console.log("====================================================\n");

  } catch (error) {
    console.error("❌ Migration failed with an exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
