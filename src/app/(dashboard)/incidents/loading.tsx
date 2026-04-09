import { Siren, ShieldAlert } from "lucide-react"

export default function IncidentsLoading() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative flex flex-col items-center justify-center p-12 rounded-full">
        {/* Radar sweeping effect */}
        <div className="absolute inset-0 border border-red-500/30 rounded-full animate-ping opacity-20 duration-1000" />
        <div className="absolute inset-4 border border-red-500/20 rounded-full animate-ping opacity-40 duration-700 delay-150" />
        
        {/* Core Icon */}
        <div className="relative z-10 flex items-center justify-center w-24 h-24 bg-red-950/50 rounded-full border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
          <Siren className="w-12 h-12 text-red-500 animate-pulse" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-2">
        <h3 className="font-mono text-xl font-bold tracking-[0.3em] text-red-500 uppercase overflow-hidden whitespace-nowrap animate-pulse">
          Triaging Signals...
        </h3>
        <div className="flex items-center space-x-2 text-xs font-mono text-red-500/60">
          <ShieldAlert className="w-4 h-4 animate-bounce" />
          <span>Intercepting global threat vectors</span>
        </div>
      </div>
    </div>
  )
}
