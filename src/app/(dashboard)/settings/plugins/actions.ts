"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import fs from "fs"
import { hasPermission } from "@/lib/auth-utils";
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { activePlugins } from "@/plugins"
import { createPluginContext } from "@/lib/plugins/sdk-context"
import { invalidateHookCache } from "@/lib/plugins/hook-engine"
import { encryptPluginConfig, parsePluginConfig } from "@/lib/plugins/crypto"

const execAsync = promisify(exec);

export async function togglePluginState(pluginId: string, currentState: boolean) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'TOGGLE_PLUGINS')) {
    throw new Error("Unauthorized");
  }

  const newState = !currentState;
  const pluginNode = activePlugins.find(p => p.manifest.id === pluginId);
  let config: Record<string, any> = {};
  
  /* istanbul ignore next */
  if (pluginNode) {
    const context = await createPluginContext(pluginNode.manifest.id, pluginNode.manifest.name);
    const state = await db.pluginState.findUnique({ where: { id: pluginId } });
    if (state?.configJson) config = parsePluginConfig(state.configJson);

    /* istanbul ignore next */
    try {
      if (newState && pluginNode.hooks?.onInstall) {
        await pluginNode.hooks.onInstall(config, context);
      } else if (!newState && pluginNode.hooks?.onUninstall) {
        await pluginNode.hooks.onUninstall(config, context);
      }
    } catch (err) {
      /* istanbul ignore next */
      console.error(`Lifecycle hook failed for plugin ${pluginId}:`, err);
      /* istanbul ignore next */
      throw new Error(`Plugin lifecycle initialization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const configSavePayload = Object.keys(config).length ? encryptPluginConfig(config) : "{}";

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { isActive: newState },
    create: { id: pluginId, isActive: newState, configJson: configSavePayload }
  });

  invalidateHookCache();


  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function updatePluginConfig(pluginId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'CONFIGURE_PLUGINS')) {
    throw new Error("Unauthorized");
  }

  const state = await db.pluginState.findUnique({ where: { id: pluginId } });
  let config: Record<string, any> = {};
  
  if (state?.configJson) {
    config = parsePluginConfig(state.configJson);
  }

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) {
        // Prevent Prototype Pollution
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        
        // @ts-ignore
        config[key] = value;
    }
  }

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { configJson: encryptPluginConfig(config) },
    create: { id: pluginId, isActive: false, configJson: encryptPluginConfig(config) }
  });

  invalidateHookCache();

  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function installExternalPlugin(pluginId: string, version: string, sourceType: string, packageName?: string) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'INSTALL_PLUGINS')) {
    throw new Error("Unauthorized");
  }

  if (sourceType === "registry") {
    // Prevent Path Traversal
    if (!/^[a-zA-Z0-9\-]+$/.test(pluginId)) {
      throw new Error("Invalid plugin ID format. Only alphanumeric characters and hyphens are permitted.");
    }
    
    // Ensure version only contains safe characters as well
    if (!/^[a-zA-Z0-9\.\-\^]+$/.test(version)) {
      throw new Error("Invalid version string format.");
    }

    const res = await fetch(`https://raw.githubusercontent.com/Cyber-Sec-Space/openticket-plugin-registry/main/plugins/${pluginId}/${version}/index.tsx`);
    if (!res.ok) throw new Error(`Failed to download plugin source code from registry (HTTP ${res.status}).`);
    const code = await res.text();
    
    const pluginsDir = path.join(process.cwd(), "src/plugins");
    const pluginFile = path.join(pluginsDir, `external-${pluginId}.tsx`);
    
    // Additional boundary check to ensure the file resolves securely inside the plugins directory
    if (!pluginFile.startsWith(pluginsDir)) {
      throw new Error("Path traversal boundaries violated.");
    }

    await fs.promises.writeFile(pluginFile, code, "utf-8");
    
    // Inject into index.ts
    const indexPath = path.join(pluginsDir, "index.ts");
    let indexCode = await fs.promises.readFile(indexPath, "utf-8");
    
    const importName = "external" + pluginId.replace(/[-_@/]/g, "") + "Plugin";
    const importStatement = `import ${importName} from "./external-${pluginId}";\n`;
    
    if (!indexCode.includes(importStatement)) {
      /* istanbul ignore next */
      indexCode = importStatement + indexCode;
      
      const newCode = indexCode.replace(
        /export\s+const\s+activePlugins\s*:\s*OpenTicketPlugin\[\]\s*=\s*\[/, 
        `export const activePlugins: OpenTicketPlugin[] = [\n  ${importName},`
      );
      
      /* istanbul ignore next */
      if (indexCode === newCode) {
         throw new Error("Failed to inject plugin: activePlugins array structure is malformed or missing.");
      }
      
      indexCode = newCode;
      await fs.promises.writeFile(indexPath, indexCode, "utf-8");
    }
  } else if (sourceType === "npm" && packageName) {
    /* istanbul ignore next */
    throw new Error("NPM dynamic installation via UI is currently restricted. Please use CLI.");
  }
}

export async function triggerProductionBuild() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'RESTART_SYSTEM_SERVICES')) throw new Error("Unauthorized");
  // Execute the production build (Wait asynchronously)
  await execAsync("npm run build");
}

export async function triggerServerRestart() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'RESTART_SYSTEM_SERVICES')) throw new Error("Unauthorized");
  
  // Schedule the process kill out of band so the HTTP response can return success to UI first.
  // Next.js will close gracefully and be brought back up by PM2/Docker restart-policies.
  setTimeout(() => process.exit(0), 1000);
}
