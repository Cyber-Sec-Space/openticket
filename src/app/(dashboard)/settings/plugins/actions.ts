"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec);

export async function togglePluginState(pluginId: string, currentState: boolean) {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  const newState = !currentState;
  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { isActive: newState },
    create: { id: pluginId, isActive: newState, configJson: "{}" }
  });

  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function updatePluginConfig(pluginId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  const state = await db.pluginState.findUnique({ where: { id: pluginId } });
  let config = {};
  
  if (state?.configJson) {
    try {
      config = JSON.parse(state.configJson);
    } catch (e) {
      console.error("Failed to parse plugin config json", e);
    }
  }

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) {
        // @ts-ignore
        config[key] = value;
    }
  }

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { configJson: JSON.stringify(config) },
    create: { id: pluginId, isActive: false, configJson: JSON.stringify(config) }
  });

  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function installExternalPlugin(pluginId: string, version: string, sourceType: string, packageName?: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  if (sourceType === "registry") {
    const res = await fetch(`https://raw.githubusercontent.com/Cyber-Sec-Space/openticket-plugin-registry/main/plugins/${pluginId}/${version}/index.tsx`);
    if (!res.ok) throw new Error(`Failed to download plugin source code from registry (HTTP ${res.status}).`);
    const code = await res.text();
    
    const pluginsDir = path.join(process.cwd(), "src/plugins");
    const pluginFile = path.join(pluginsDir, `external-${pluginId}.tsx`);
    fs.writeFileSync(pluginFile, code, "utf-8");
    
    // Inject into index.ts
    const indexPath = path.join(pluginsDir, "index.ts");
    let indexCode = fs.readFileSync(indexPath, "utf-8");
    
    const importName = "external" + pluginId.replace(/[-_@/]/g, "") + "Plugin";
    if (!indexCode.includes(`from "./external-${pluginId}"`)) {
      const importStatement = `import ${importName} from "./external-${pluginId}";\n`;
      indexCode = importStatement + indexCode;
      
      indexCode = indexCode.replace(
        /export const activePlugins: OpenTicketPlugin\[\] = \[/, 
        `export const activePlugins: OpenTicketPlugin[] = [\n  ${importName},`
      );
      fs.writeFileSync(indexPath, indexCode, "utf-8");
    }
  } else if (sourceType === "npm" && packageName) {
    throw new Error("NPM dynamic installation via UI is currently restricted. Please use CLI.");
  }
}

export async function triggerProductionBuild() {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) throw new Error("Unauthorized");
  // Execute the production build (Wait asynchronously)
  await execAsync("npm run build");
}

export async function triggerServerRestart() {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) throw new Error("Unauthorized");
  
  // Schedule the process kill out of band so the HTTP response can return success to UI first.
  // Next.js will close gracefully and be brought back up by PM2/Docker restart-policies.
  setTimeout(() => process.exit(0), 1000);
}
