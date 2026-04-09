import { RefreshCw, Server, ShieldCheck } from "lucide-react"

export default function SystemSettingsLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12 animate-fade-in-up pb-20">
      <div className="relative flex items-center justify-center">
        <Server className="w-16 h-16 text-emerald-400 absolute" />
        <RefreshCw className="w-32 h-32 text-emerald-500/30 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 bg-emerald-500/10 blur-[50px] rounded-full scale-150 animate-pulse"></div>
      </div>
      
      <div className="text-center space-y-6 z-10">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-[0.2em] uppercase text-emerald-400 shadow-emerald-500/50 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
          Initializing Hub Directives
        </h2>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-6">
             <ShieldCheck className="w-4 h-4 text-emerald-500/70 mr-2" />
             <span className="text-sm md:text-base text-muted-foreground font-mono animate-pulse tracking-wide">Loading Platform Matrix...</span>
          </div>
          <div className="w-64 md:w-80 h-1 bg-black/40 border border-white/5 rounded-full overflow-hidden mt-6 relative shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/80 to-emerald-500/0 w-full animate-pulse blur-[1px]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
