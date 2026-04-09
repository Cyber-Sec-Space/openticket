import { Bug, SearchCode } from "lucide-react"

export default function VulnerabilitiesLoading() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500 overflow-hidden">
      <div className="relative flex flex-col items-center justify-center">
        {/* Radar/Scan Lines */}
        <div className="absolute w-[200%] h-[2px] bg-yellow-500/50 blur-[2px] animate-[spin_3s_linear_infinite]" />
        <div className="absolute w-[2px] h-[200%] bg-yellow-500/50 blur-[2px] animate-[spin_3s_linear_infinite]" />
        
        {/* Core Icon wrapper */}
        <div className="relative z-10 flex items-center justify-center w-28 h-28 bg-yellow-950/40 rounded-3xl border border-yellow-500/40 shadow-[inset_0_0_20px_rgba(234,179,8,0.2)] overflow-hidden">
          {/* Cyberpunk scanning overlay */}
          <div className="absolute top-0 left-0 w-full h-[15%] bg-yellow-400/20 blur shadow-[0_5px_15px_rgba(234,179,8,0.8)] animate-[bounce_2s_ease-in-out_infinite]" />
          
          <Bug className="w-14 h-14 text-yellow-500" />
        </div>
      </div>
      
      <div className="mt-10 flex flex-col items-center space-y-3">
        <h3 className="font-mono text-xl font-bold tracking-[0.3em] text-yellow-500 uppercase overflow-hidden whitespace-nowrap border-r-2 border-yellow-500 pr-2 animate-[pulse_1s_infinite]">
          Scanning Dictionaries...
        </h3>
        <div className="flex items-center space-x-2 text-xs font-mono text-yellow-500/70 bg-yellow-950/50 px-3 py-1 rounded-full border border-yellow-500/20">
          <SearchCode className="w-4 h-4 animate-spin-slow" />
          <span>Cross-referencing CVE signatures</span>
        </div>
      </div>
    </div>
  )
}
