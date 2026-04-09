import { ScrollText, Activity } from "lucide-react"

export default function AuditLoading() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500 overflow-hidden">
      <div className="relative flex flex-col items-center justify-center">
        {/* Trailing data lines */}
        <div className="absolute top-0 -left-12 w-64 h-[1px] bg-indigo-500/30 animate-[ping_2s_linear_infinite]" />
        <div className="absolute bottom-0 -right-12 w-64 h-[1px] bg-indigo-500/30 animate-[ping_3s_linear_infinite]" />
        
        {/* Core Icon wrapper */}
        <div className="relative z-10 flex items-center justify-center w-24 h-24 bg-indigo-950/40 rounded-xl border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <ScrollText className="w-10 h-10 text-indigo-400 animate-pulse" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-2">
        <h3 className="font-mono text-xl font-bold tracking-[0.3em] text-indigo-400 uppercase">
          Tracing Vectors...
        </h3>
        <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400/60">
          <Activity className="w-4 h-4 animate-bounce" />
          <span>Decrypting historical audit trails</span>
        </div>
      </div>
    </div>
  )
}
