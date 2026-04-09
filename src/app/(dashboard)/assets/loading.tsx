import { Server, Cpu, Database } from "lucide-react"

export default function AssetsLoading() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500 overflow-hidden">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Connecting Lines */}
        <div className="absolute inset-x-0 h-[1px] bg-cyan-500/30 animate-pulse top-1/2" />
        <div className="absolute inset-y-0 w-[1px] bg-cyan-500/30 animate-pulse left-1/2" />
        
        {/* Nodes */}
        <div className="absolute top-4 left-4 p-3 bg-cyan-950/40 rounded-lg border border-cyan-500/30">
          <Database className="w-6 h-6 text-cyan-500/50" />
        </div>
        <div className="absolute bottom-4 right-4 p-3 bg-cyan-950/40 rounded-lg border border-cyan-500/30">
          <Cpu className="w-6 h-6 text-cyan-500/50" />
        </div>

        {/* Central Server */}
        <div className="relative z-10 p-6 bg-cyan-950/80 rounded-xl border border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
          <Server className="w-12 h-12 text-cyan-400" />
          {/* Scanning Beam */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-[ping_2s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-2">
        <h3 className="font-mono text-xl font-bold tracking-[0.3em] text-cyan-400 uppercase">
          Mapping Infrastructure...
        </h3>
        <span className="text-xs font-mono text-cyan-500/60 tracking-widest">
          Polling telemetry & heartbeat signatures
        </span>
      </div>
    </div>
  )
}
