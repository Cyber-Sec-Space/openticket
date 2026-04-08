import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "./plugin-card"

export default async function PluginManagementPage() {
  const session = await auth()
  if (!session?.user?.id || !hasPermission(session as any, 'VIEW_PLUGINS')) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();

  const installedPlugins = activePlugins.filter(plugin => {
    const state = dbStates.find(s => s.id === plugin.manifest.id);
    return state?.isActive;
  });

  return (
    <div className="space-y-4">
      {installedPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 animate-fade-in-up">
          {installedPlugins.map(plugin => {
            const state = dbStates.find(s => s.id === plugin.manifest.id);
            return (
              <PluginCard 
                key={plugin.manifest.id} 
                manifest={plugin.manifest} 
                isActive={true} 
                configJson={state?.configJson || null}
                layout="grid"
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/20 rounded-xl border border-white/5 border-dashed">
          <p className="text-muted-foreground font-medium mb-1">No Active Plugins</p>
          <p className="text-sm text-neutral-500">You haven't installed any plugins from the store yet.</p>
        </div>
      )}
    </div>
  )
}
