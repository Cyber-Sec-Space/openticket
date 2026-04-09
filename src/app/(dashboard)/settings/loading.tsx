import { Fingerprint, UserCog, Lock } from "lucide-react"

export default function SettingsLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12 animate-fade-in-up pb-20">
      <div className="relative flex items-center justify-center">
        <Fingerprint className="w-16 h-16 text-blue-400 absolute" />
        <UserCog className="w-32 h-32 text-blue-500/30 animate-spin" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-0 bg-blue-500/10 blur-[50px] rounded-full scale-150 animate-pulse"></div>
      </div>
      
      <div className="text-center space-y-6 z-10">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-[0.2em] uppercase text-blue-400 shadow-blue-500/50 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          Decrypting Identity Matrix
        </h2>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-6">
             <Lock className="w-4 h-4 text-blue-500/70 mr-2" />
             <span className="text-sm md:text-base text-muted-foreground font-mono animate-pulse tracking-wide">Verifying Security Perimeter...</span>
          </div>
          <div className="w-64 md:w-80 h-1 bg-black/40 border border-white/5 rounded-full overflow-hidden mt-6 relative shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/80 to-blue-500/0 w-full animate-pulse blur-[1px]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
