import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "../plugin-card"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { getGlobalSettings } from "@/lib/settings";

// We define the registry interface based on the latest JSON schema
interface RegistryPluginVersion {
  sourceType: "npm" | "registry";
  packageName?: string;
  configSchema: any[];
  requestedPermissions?: string[];
  options?: any;
  dependsOn?: string[];
  signature?: string;
  supportedPluginApiVersion?: string[];
}

interface RegistryPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  icon: string;
  latestVersion: string;
  versions: Record<string, RegistryPluginVersion>;
}

// Ensure the page stays dynamically updated or caches effectively
export const dynamic = "force-dynamic";

export default async function PluginStorePage() {
  const session = await auth()
  if (!session?.user?.id || !hasPermission(session, 'VIEW_PLUGINS')) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();
  const settings = await getGlobalSettings();
  
  let registryPlugins: RegistryPlugin[] = [];
  try {
    let rawData: any;
    
    let fetched = false;
    
    // Developer Sandbox: Resolve from local filesystem if in dev mode
    if (process.env.NODE_ENV !== "production") {
      const fs = await import("fs");
      const path = await import("path");
      const localRegistryPath = path.resolve(process.cwd(), "../openticket-plugin-registry/registry.json");
      if (fs.existsSync(localRegistryPath)) {
        rawData = JSON.parse(await fs.promises.readFile(localRegistryPath, "utf-8"));
        fetched = true;
      } else {
        console.warn(`[DEV] Local dev registry not found at ${localRegistryPath}. Falling back to remote production registry...`);
      }
    }
    
    if (!fetched) {
      // Use ISR caching (revalidate every 300 seconds / 5 minutes) to avoid GitHub Rate Limiting
      const res = await fetch("https://raw.githubusercontent.com/Cyber-Sec-Space/openticket-plugin-registry/main/registry.json", { next: { revalidate: 300 } });
      if (res.ok) {
        rawData = await res.json();
      } else {
        console.error("Failed to fetch registry list data:", res.status);
      }
    }
      
    // Native Structural Validation Boundary
    if (Array.isArray(rawData)) {
      registryPlugins = rawData.filter(p => {
        return (
          typeof p === 'object' &&
          p !== null &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          typeof p.latestVersion === 'string' &&
          typeof p.versions === 'object' &&
          p.versions !== null &&
          p.versions[p.latestVersion] !== undefined
        );
      }) as RegistryPlugin[];
    }
  } catch (error) {
    console.error("Registry load error", error);
  }

  return (
    <div className="space-y-4">
      {registryPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 animate-fade-in-up">
          {registryPlugins.map(plugin => {
            const state = dbStates.find(s => s?.id === plugin?.id);
            // Locate the true execution node if it exists locally
            const activePluginNode = activePlugins.find(p => p?.manifest?.id === plugin?.id);
            const isLocal = !!activePluginNode;

            // Merge registry metadata upwards to perfectly match the expected `OpenTicketPlugin['manifest']` shape for PluginCard
            const cardManifest = activePluginNode ? {
              ...plugin,
              ...activePluginNode.manifest,
              signature: activePluginNode.manifest.signature || plugin.versions[plugin.latestVersion]?.integritySha256,
              supportedPluginApiVersion: activePluginNode.manifest.supportedPluginApiVersion || plugin.versions[plugin.latestVersion]?.supportedPluginApiVersion
            } : {
              ...plugin,
              version: plugin.latestVersion,
              requestedPermissions: plugin.versions[plugin.latestVersion]?.requestedPermissions || [],
              supportedPluginApiVersion: plugin.versions[plugin.latestVersion]?.supportedPluginApiVersion || [],
              signature: plugin.versions[plugin.latestVersion]?.integritySha256 || plugin.signature
            };

            return (
              <PluginCard 
                key={plugin.id} 
                manifest={cardManifest as any} 
                isActive={state?.isActive || false} 
                configJson={state?.configJson ? JSON.stringify(parsePluginConfig(state.configJson)) : null}
                layout="grid"
                versions={plugin.versions}
                latestVersion={plugin.latestVersion}
                isLocal={isLocal}
                systemPlatformUrl={settings?.systemPlatformUrl || "http://localhost:3000"}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/20 rounded-xl border border-white/5 border-dashed">
          <p className="text-muted-foreground font-medium mb-1">Cannot Connect to Plugin Registry</p>
          <p className="text-sm text-neutral-500">Ensure the server has outgoing internet access and GitHub is reachable.</p>
        </div>
      )}
    </div>
  )
}
