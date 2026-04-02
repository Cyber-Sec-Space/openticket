import { Shield } from "lucide-react"
import { PluginsNav } from "./plugins-nav"

export default function PluginsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_10px_currentColor]" /> 
          Plugin Architecture
        </h2>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Control the runtime execution context of physically bundled Next.js statically bound plugins. Installed extensions operate in an isolated memory scope synchronized via our central Hook Engine EventBus.
        </p>
      </div>

      <PluginsNav />

      <div className="pt-2">
        {children}
      </div>
    </div>
  )
}
