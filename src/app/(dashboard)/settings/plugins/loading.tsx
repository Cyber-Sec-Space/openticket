import { ToyBrick } from "lucide-react"

export default function PluginsLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border bg-primary/5 border-primary/30 flex flex-col justify-between h-full gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <ToyBrick className="w-8 h-8 text-primary/30 animate-pulse" />
                <div className="h-[22px] w-12 bg-white/10 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="h-6 w-3/4 max-w-[200px] bg-white/10 rounded animate-pulse"></div>
                <div className="h-[22px] w-28 bg-emerald-500/20 border-emerald-500/30 border rounded-full mt-1 animate-pulse"></div>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="h-4 w-full bg-white/5 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end gap-2">
              <div className="h-9 w-full bg-red-500/20 border border-red-500/30 rounded-md animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
