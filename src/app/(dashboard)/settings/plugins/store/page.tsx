import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "../plugin-card"

// We define the registry interface based on the latest JSON schema
interface RegistryPluginVersion {
  sourceType: "npm" | "registry";
  packageName?: string;
  configSchema: any[];
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
  if (!session?.user?.id || !hasPermission(session as any, 'SYSTEM_SETTINGS')) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();
  
  let registryPlugins: RegistryPlugin[] = [];
  try {
    const res = await fetch("https://raw.githubusercontent.com/Cyber-Sec-Space/openticket-plugin-registry/main/registry.json", { cache: "no-store" });
    if (res.ok) {
      registryPlugins = await res.json();
    } else {
      console.error("Failed to fetch registry list", res.status);
    }
  } catch (error) {
    console.error("Registry fetch error", error);
  }

  return (
    <div className="space-y-4">
      {registryPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 animate-fade-in-up">
          {registryPlugins.map(plugin => {
            const state = dbStates.find(s => s.id === plugin.id);
            // It is considered 'available locally' if it exists in the activePlugins list bundle
            const isLocal = !!activePlugins.find(p => p.manifest.id === plugin.id);

            return (
              <PluginCard 
                key={plugin.id} 
                manifest={plugin as any} // Pass registry manifest natively
                isActive={state?.isActive || false} 
                configJson={state?.configJson || null}
                layout="grid"
                versions={plugin.versions}
                latestVersion={plugin.latestVersion}
                isLocal={isLocal}
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
