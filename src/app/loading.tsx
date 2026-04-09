import { Loader2 } from "lucide-react"

export default function GlobalRootLoading() {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/30 rounded-full animate-pulse" />
          <Loader2 className="w-14 h-14 text-primary animate-spin relative" />
        </div>
        <div className="font-mono text-sm tracking-[0.2em] text-primary/80 uppercase animate-pulse">
          Authenticating Identity...
        </div>
      </div>
    </div>
  )
}
