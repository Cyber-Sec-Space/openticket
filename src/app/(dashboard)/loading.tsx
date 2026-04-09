import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="flex flex-col items-center space-y-4">
        {/* Glow effect surrounding the loader */}
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
        </div>
        <div className="font-mono text-sm tracking-widest text-primary/80 uppercase animate-pulse">
          Establishing Secure Link...
        </div>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}
