import { Fingerprint, ScanFace } from "lucide-react"

export default function UsersLoading() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500 overflow-hidden">
      <div className="relative flex flex-col items-center justify-center w-32 h-32">
        {/* Hexagonal or tech grid background simulation */}
        <div className="absolute inset-0 border-[3px] border-emerald-500/20 rounded-xl rotate-45 animate-[pulse_2s_infinite]" />
        <div className="absolute inset-2 border border-emerald-400/30 rounded-xl rotate-45 animate-ping opacity-20 duration-1000" />
        
        {/* The fingerprint icon with a glitch/scan effect */}
        <div className="relative z-10 w-20 h-20 bg-emerald-950/60 rounded-full flex items-center justify-center border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] overflow-hidden">
          <Fingerprint className="w-12 h-12 text-emerald-400 animate-pulse" />
          
          {/* Scan line reading the fingerprint */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-300 shadow-[0_0_10px_#34d399] animate-[ping_1.5s_linear_infinite] opacity-80" />
        </div>
      </div>
      
      <div className="mt-12 flex flex-col items-center space-y-2">
        <h3 className="font-mono text-xl font-bold tracking-[0.4em] text-emerald-400 uppercase">
          Verifying Identities...
        </h3>
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-500/70">
          <ScanFace className="w-4 h-4 animate-pulse" />
          <span>Synchronizing Zero-Trust Matrix</span>
        </div>
      </div>
    </div>
  )
}
