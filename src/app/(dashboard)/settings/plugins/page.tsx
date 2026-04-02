import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { PluginCard } from "./plugin-card"
import { Shield } from "lucide-react"

export default async function PluginManagementPage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    redirect("/")
  }

  const dbStates = await db.pluginState.findMany();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Plugin Manager
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Control the system execution context of physically bundled Next.js statically bound plugins.
          </p>
        </div>
      </div>

      <div className="pt-4 space-y-4">
        {activePlugins.map(plugin => {
          const state = dbStates.find(s => s.id === plugin.manifest.id);
          return (
            <PluginCard 
              key={plugin.manifest.id} 
              plugin={plugin} 
              isActive={state?.isActive || false} 
              configJson={state?.configJson || null}
            />
          )
        })}

        {activePlugins.length === 0 && (
          <div className="p-8 text-center border-dashed border border-white/20 rounded-xl bg-white/5">
            <p className="text-muted-foreground">The static code registry (src/plugins/index.ts) is empty.</p>
          </div>
        )}
      </div>
    </div>
  )
}
