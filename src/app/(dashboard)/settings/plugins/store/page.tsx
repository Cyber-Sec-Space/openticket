import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "../plugin-card"

export default async function PluginStorePage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();

  const uninstalledPlugins = activePlugins.filter(plugin => {
    const state = dbStates.find(s => s.id === plugin.manifest.id);
    return !state?.isActive;
  });

  return (
    <div className="space-y-4">
      {uninstalledPlugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pt-2 animate-fade-in-up">
          {uninstalledPlugins.map(plugin => {
            const state = dbStates.find(s => s.id === plugin.manifest.id);
            return (
              <PluginCard 
                key={plugin.manifest.id} 
                manifest={plugin.manifest} 
                isActive={false} 
                configJson={state?.configJson || null}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-black/20 rounded-xl border border-white/5 border-dashed">
          <p className="text-muted-foreground font-medium mb-1">Plugin Store is Empty</p>
          <p className="text-sm text-neutral-500">All available extensions have already been installed to your workspace.</p>
        </div>
      )}
    </div>
  )
}
