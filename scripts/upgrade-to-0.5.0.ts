import 'dotenv/config';
import { PrismaClient, Permission } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;

async function main() {
  console.log("====================================================");
  console.log("🚀 OpenTicket 0.5.0 Migration Utility 🚀");
  console.log("====================================================\n");

  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is missing in .env file.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("[1/2] Checking if migration is already applied...");

    const adminRole = await prisma.customRole.findUnique({ where: { name: 'System Administrator' } });
    if (adminRole && adminRole.permissions.includes(Permission.VIEW_PLUGINS)) {
       console.log("      [SKIPPED] System Administrator already has VIEW_PLUGINS permission.");
       console.log("🎉 Upgrade to v0.5.0 already applied. Safe to proceed.\n");
       return;
    }

    console.log("[2/2] Applying schema and checking metadata...");

    const allRoles = await prisma.customRole.findMany();

    const pluginAdminPerms = [
      Permission.VIEW_PLUGINS,
      Permission.INSTALL_PLUGINS,
      Permission.TOGGLE_PLUGINS,
      Permission.CONFIGURE_PLUGINS
    ];

    let updatedRoles = 0;

    for (const role of allRoles) {
      let modified = false;
      let newPermissions = [...role.permissions];

      // Give Global Auditor or Viewer of settings access to view plugins
      if (
        role.permissions.includes(Permission.VIEW_SYSTEM_SETTINGS) &&
        !newPermissions.includes(Permission.VIEW_PLUGINS)
      ) {
        newPermissions.push(Permission.VIEW_PLUGINS);
        modified = true;
      }

      // Give Administrators or DevOps Engineers full plugin management capabilities
      const hasAdminLevelAccess = role.permissions.includes(Permission.MANAGE_INTEGRATIONS) || role.name === 'System Administrator';
      
      if (hasAdminLevelAccess) {
        for (const p of pluginAdminPerms) {
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
        console.log(`      -> Upgraded permissions for role: ${role.name}`);
      }
    }

    if (updatedRoles === 0) {
       console.log("      ✅ All roles already contain required Plugin permissions.");
    } else {
       console.log(`      ✅ Successfully upgraded ${updatedRoles} roles with Plugin permissions.`);
    }

    console.log("\n[2/2] Migrating schema metadata completed.\n");

    console.log("====================================================");
    console.log("🎉 Upgrade to v0.5.0 Complete! 🎉");
    console.log("You can now safely login and manage Plugins.");
    console.log("====================================================\n");

  } catch (error) {
    console.error("❌ Migration failed with an exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
