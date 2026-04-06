import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "./plugin-card"
import { Shield, Sparkles, FolderDown } from "lucide-react"

export default async function PluginManagementPage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();

  const installedPlugins = activePlugins.filter(plugin => {
    const state = dbStates.find(s => s.id === plugin.manifest.id);
    return state?.isActive;
  });

  const uninstalledPlugins = activePlugins.filter(plugin => {
    const state = dbStates.find(s => s.id === plugin.manifest.id);
    return !state?.isActive;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-fade-in-up pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_10px_currentColor]" /> 
          Plugin Architecture
        </h2>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Control the runtime execution context of physically bundled Next.js statically bound plugins. Installed extensions operate in an isolated memory scope synchronized via our central Hook Engine EventBus.
        </p>
      </div>

      {/* Installed Plugins Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">Installed Drivers</h3>
          <span className="ml-2 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">
            {installedPlugins.length} Active
          </span>
        </div>

        {installedPlugins.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 pt-2">
            {installedPlugins.map(plugin => {
              const state = dbStates.find(s => s.id === plugin.manifest.id);
              return (
                <PluginCard 
                  key={plugin.manifest.id} 
                  manifest={plugin.manifest} 
                  isActive={true} 
                  configJson={state?.configJson || null}
                />
              )
            })}
          </div>
        ) : (
          <div className="p-10 text-center border border-white/5 rounded-xl bg-black/30 flex flex-col items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No plugins are currently active.</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Explore the Plugin Store below to extend the capabilities of your SOC environment natively.
            </p>
          </div>
        )}
      </div>

      {/* Plugin Store Section */}
      <div className="space-y-4 pt-8">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <FolderDown className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Plugin Store</h3>
        </div>

        {uninstalledPlugins.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 pt-2">
            {uninstalledPlugins.map(plugin => {
              return (
                <PluginCard 
                  key={plugin.manifest.id} 
                  manifest={plugin.manifest} 
                  isActive={false} 
                  configJson={null}
                />
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center border-dashed border border-white/20 rounded-xl bg-white/5">
            <p className="text-muted-foreground">No available core integrations remaining.</p>
          </div>
        )}
      </div>
    </div>
  )
}
