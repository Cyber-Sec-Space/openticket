import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "./plugin-card"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { getGlobalSettings } from "@/lib/settings";

export default async function PluginManagementPage() {
  const session = await auth()
  if (!session?.user?.id || !hasPermission(session, 'VIEW_PLUGINS')) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();
  const settings = await getGlobalSettings();

  // Filter out globally undefined or malformed configurations to prevent rendering exceptions
  const installedPlugins = activePlugins.filter(p => p && p.manifest && p.manifest.id);

  return (
    <div className="space-y-4">
      {installedPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 animate-fade-in-up">
          {installedPlugins.map(plugin => {
            const state = dbStates.find(s => s.id === plugin.manifest.id);
            const decryptedConfig = state?.configJson ? parsePluginConfig(state.configJson) : null;
            return (
              <PluginCard 
                key={plugin.manifest.id} 
                manifest={plugin.manifest} 
                isActive={state?.isActive || false} 
                configJson={decryptedConfig ? JSON.stringify(decryptedConfig) : null}
                layout="grid"
                clickMode="config"
                systemPlatformUrl={settings?.systemPlatformUrl || "http://localhost:3000"}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/20 rounded-xl border border-white/5 border-dashed">
          <p className="text-muted-foreground font-medium mb-1">No Installed Plugins</p>
          <p className="text-sm text-neutral-500">{"You haven't installed any plugins from the store yet."}</p>
        </div>
      )}
    </div>
  )
}
