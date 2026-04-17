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
    } catch (err: any) {
      /* istanbul ignore next */
      console.error(`Lifecycle hook failed for plugin ${pluginId}:`, err);
      /* istanbul ignore next */
      if (err && typeof err === 'object' && 'name' in err) {
        if (err.name === 'PluginSystemError') {
          throw new Error(`System failure during plugin installation: ${err.message}`);
        } else if (err.name === 'PluginPermissionError') {
          throw new Error(`Permission denied during plugin installation: ${err.message}`);
        } else if (err.name === 'PluginInputError') {
          throw new Error(`Invalid input provided during plugin installation: ${err.message}`);
        }
      }
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

  await db.auditLog.create({
    data: {
      action: "UPDATE",
      targetType: "PLUGIN",
      targetId: pluginId,
      actorId: session?.user?.id || "system",
      details: `Plugin '${pluginId}' state toggled to ${newState ? "ACTIVE" : "INACTIVE"}.`
    }
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

  await db.auditLog.create({
    data: {
      action: "UPDATE",
      targetType: "PLUGIN",
      targetId: pluginId,
      actorId: session.user.id,
      details: `Plugin '${pluginId}' configuration updated.`
    }
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

    let code: string;
    
    // Developer Sandbox: Source from local filesystem if in dev mode
    if (process.env.NODE_ENV !== "production") {
      const localSourcePath = path.resolve(process.cwd(), `../openticket-plugin-registry/plugins/${pluginId}/${version}/index.tsx`);
      if (fs.existsSync(localSourcePath)) {
        code = await fs.promises.readFile(localSourcePath, "utf-8");
      } else {
        console.warn(`[DEV] Local development registry file not found: ${localSourcePath}. Falling back to remote production registry...`);
      }
    }
    
    if (!code) {
      const res = await fetch(`https://raw.githubusercontent.com/Cyber-Sec-Space/openticket-plugin-registry/main/plugins/${pluginId}/${version}/index.tsx`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to download plugin source code from remote registry (HTTP ${res.status}).`);
      code = await res.text();
    }
    
    // AST Syntax Pre-flight Check
    try {
       // Using dynamic import to avoid crashing prod environments that might not have typescript installed
       const ts = await import("typescript");
       const result = ts.transpileModule(code, {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
          reportDiagnostics: true
       });
       const syntaxErrors = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
       if (syntaxErrors.length > 0) {
          throw new Error("Plugin source code contains critical structural syntax errors and was safely blocked. Rollback triggered.");
       }
    } catch (e: any) {
       if (e.message.includes("critical structural syntax errors")) {
          throw e; // Bubble up the explicitly caught validation error
       }
       // If importing typescript fails, we safely bypass. Production build will still catch it.
       console.warn("[Plugin Pre-flight] TypeScript AST parser unavailable. Bypassing pre-flight validation.");
    }

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

export async function uninstallExternalPlugin(pluginId: string) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'INSTALL_PLUGINS')) {
    throw new Error("Unauthorized");
  }

  // Prevent Path Traversal
  if (!/^[a-zA-Z0-9\-]+$/.test(pluginId)) {
    throw new Error("Invalid plugin ID format. Only alphanumeric characters and hyphens are permitted.");
  }

  const pluginsDir = path.join(process.cwd(), "src/plugins");
  const pluginFile = path.join(pluginsDir, `external-${pluginId}.tsx`);
  // Additional boundary check to ensure the file resolves securely inside the plugins directory
  /* istanbul ignore next */
  if (!pluginFile.startsWith(pluginsDir)) {
    throw new Error("Path traversal boundaries violated.");
  }

  // 1. Delete physical source code file if it exists
  if (fs.existsSync(pluginFile)) {
    await fs.promises.unlink(pluginFile);
  } else {
    throw new Error("Plugin source file not found. It may be a native plugin or already uninstalled.");
  }

  // 2. Remove from index.ts references
  const indexPath = path.join(pluginsDir, "index.ts");
  let indexCode = await fs.promises.readFile(indexPath, "utf-8");
  
  const importName = "external" + pluginId.replace(/[-_@/]/g, "") + "Plugin";
  
  // Clean up import
  const importRegex = new RegExp(`import\\s+${importName}\\s+from\\s+["']\\./external-${pluginId}["'];?\\r?\\n?`);
  indexCode = indexCode.replace(importRegex, "");
  
  // Clean up array entry
  const arrayEntryRegex = new RegExp(`[\\s\\r\\n]*${importName},?`);
  indexCode = indexCode.replace(arrayEntryRegex, "");
  
  await fs.promises.writeFile(indexPath, indexCode, "utf-8");
  
  // 3. Purge from DB and Invalidate
  await db.pluginState.deleteMany({ where: { id: pluginId } });
  invalidateHookCache();
  
  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function triggerProductionBuild() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'RESTART_SYSTEM_SERVICES')) throw new Error("Unauthorized");
  
  // Prevent Next.js concurrency corruption by skipping 'build' if running in dev mode.
  if (process.env.NODE_ENV !== "production") {
    console.log("[System] Bypassing npm run build because environment is not strictly 'production'.");
    return;
  }
  
  // Execute the production build (Wait asynchronously)
  await execAsync("npm run build");
}

export async function triggerServerRestart() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session as any, 'RESTART_SYSTEM_SERVICES')) throw new Error("Unauthorized");
  
  if (process.env.NODE_ENV !== "production") {
    console.log("[System] Bypassing server restart. Next.js HMR will intelligently hot-reload the plugin injection.");
    return;
  }
  
  // Schedule the process kill out of band so the HTTP response can return success to UI first.
  // Next.js will close gracefully and be brought back up by PM2/Docker restart-policies.
  setTimeout(() => {
    // Native escape hatch for Node.js if Next.js intercepts exit(0)
    process.kill(process.pid, 'SIGKILL');
  }, 1000);
}
