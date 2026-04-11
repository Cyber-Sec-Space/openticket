/**
 * Emergency Plugin Safe-Mode Utility
 * Runs when `npm run plugin:reset` is invoked.
 * Purges `src/plugins/index.ts` to an empty safe state and deletes all external plugins.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const PLUGINS_DIR = path.join(process.cwd(), 'src/plugins');
const INDEX_FILE = path.join(PLUGINS_DIR, 'index.ts');

const DEFAULT_INDEX_CODE = `import { OpenTicketPlugin } from "../lib/plugins/types"

// Core framework execution target point.
// Plugins should not be bundled in this core repository. The activePlugins array must remain strictly unoccupied
// prior to dynamic external injections via the PluginState Engine or separate distribution architectures.

const safeRequire = (modFn: () => any) => {
  try {
    return modFn().default;
  } catch (err) {
    console.error("[Plugin System] Critical Isolation: A plugin threw an exception during initialization and was safely contained.", err);
    return null;
  }
};

export const activePlugins: OpenTicketPlugin[] = [
].filter(Boolean);
`;

(async function emergencyReset() {
  console.log('🚨 [Safe Mode] Initiating Plugin System Emergency Reset...');

  try {
    if (!fs.existsSync(PLUGINS_DIR)) {
       console.log('✅ [Safe Mode] Plugins directory does not exist. Safe.');
       return;
    }

    const files = await fs.promises.readdir(PLUGINS_DIR);
    
    // 1. Delete all external-*.tsx or external-*.ts files
    let deletedCount = 0;
    for (const file of files) {
      if (file.startsWith('external-') && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        await fs.promises.unlink(path.join(PLUGINS_DIR, file));
        console.log(`🗑️  Deleted malformed plugin source: ${file}`);
        deletedCount++;
      }
    }

    // 2. Erase the index.ts static imports to stop Turbopack Compiler crashes
    await fs.promises.writeFile(INDEX_FILE, DEFAULT_INDEX_CODE, 'utf-8');
    console.log(`🧹 Sanitized ${INDEX_FILE}`);

    // 3. Clear the database state to match the empty file system
    try {
      const prisma = new PrismaClient();
      await prisma.pluginState.updateMany({ data: { isActive: false } });
      console.log(`💾 Synchronized Database: Marked all PluginState records as inactive.`);
      await prisma.$disconnect();
    } catch (dbErr) {
      console.error(`⚠️ Could not reset database state automatically. Plugins may appear 'colored' in UI but are safely unlinked. Error:`, dbErr.message);
    }

    console.log(`✅ [Safe Mode] Complete! Purged ${deletedCount} plugins. Next.js Host Application will now compile successfully.`);
    console.log('⚡  Restart the development server or production build.');

  } catch(e) {
    console.error('❌ [Safe Mode] Failed to reset plugins directory:', e);
    process.exit(1);
  }
})();
