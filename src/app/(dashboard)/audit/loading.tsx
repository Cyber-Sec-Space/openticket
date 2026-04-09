import { ScrollText, Filter } from "lucide-react"

export default function AuditLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ScrollText className="mr-3 text-indigo-500/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-40 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-60 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="glass-card rounded-xl p-4 flex gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground/30 mr-2" />
        <div className="h-9 w-[200px] bg-white/5 rounded-md animate-pulse"></div>
        <div className="h-9 w-[150px] bg-white/5 rounded-md animate-pulse"></div>
        <div className="h-9 w-[250px] flex-1 bg-white/5 rounded-md animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <div className="bg-black/20 h-12 border-b border-border w-full flex items-center px-6 gap-4">
           <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
           <div className="h-4 w-32 bg-white/10 rounded animate-pulse ml-8"></div>
           <div className="h-4 w-40 bg-white/10 rounded animate-pulse ml-16"></div>
           <div className="h-4 w-20 bg-white/10 rounded animate-pulse ml-auto"></div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex flex-row items-center w-full h-[52px] px-6 gap-6 py-2">
              <div className="flex-none h-4 w-24 bg-white/10 rounded animate-pulse"></div>
              <div className="flex-none hidden md:block h-6 w-24 bg-indigo-500/10 rounded-full animate-pulse ml-4"></div>
              <div className="flex-1 flex flex-col gap-2 ml-4">
                 <div className="h-4 w-full max-w-[600px] bg-white/5 rounded animate-pulse"></div>
              </div>
              <div className="flex-none h-4 w-20 bg-white/5 rounded animate-pulse ml-auto text-right"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
