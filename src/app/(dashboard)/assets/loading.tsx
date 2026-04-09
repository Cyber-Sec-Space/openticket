import { Server, Filter } from "lucide-react"

export default function AssetsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Server className="mr-3 text-cyan-500/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-56 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-72 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-cyan-500/20 rounded-md animate-pulse"></div>
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="glass-card rounded-xl p-4 flex gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground/30 mr-2" />
        <div className="h-9 flex-1 min-w-[200px] bg-white/5 rounded-md animate-pulse"></div>
        <div className="h-9 w-[150px] bg-white/5 rounded-md animate-pulse"></div>
        <div className="h-9 w-[120px] bg-cyan-500/10 rounded-md animate-pulse"></div>
      </div>

      {/* Grid skeleton (Assets uses a card grid usually, so we'll do a mix or table) */}
      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <div className="bg-black/20 h-12 border-b border-border w-full flex items-center px-6 gap-4">
           <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
           <div className="h-4 w-24 bg-white/10 rounded animate-pulse ml-8"></div>
           <div className="h-4 w-24 bg-white/10 rounded animate-pulse ml-16"></div>
           <div className="h-4 w-20 bg-white/10 rounded animate-pulse ml-auto"></div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-row items-center w-full min-h-[64px] px-6 gap-6 py-2">
              <div className="flex-1 flex flex-col gap-2">
                 <div className="h-4 w-48 bg-white/10 rounded animate-pulse"></div>
                 <div className="h-2 w-32 bg-white/5 rounded animate-pulse"></div>
              </div>
              <div className="flex-none hidden md:block h-6 w-24 bg-white/10 rounded-full animate-pulse"></div>
              <div className="flex-none hidden xl:block h-4 w-32 bg-white/5 rounded animate-pulse ml-auto"></div>
              <div className="flex-none h-6 w-20 bg-white/5 rounded-full animate-pulse ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
