import { Key } from "lucide-react"

export default function RolesLoading() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pt-20 md:pt-8 bg-background text-foreground antialiased selection:bg-primary/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border/40 pb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent blur-3xl -z-10 rounded-full" />
        <div>
          <div className="flex items-center">
            <Key className="w-8 h-8 mr-3 text-primary/30 animate-pulse" />
            <div className="h-9 w-64 bg-white/10 rounded-md animate-pulse"></div>
          </div>
          <div className="mt-2 flex flex-col gap-1 w-full max-w-2xl">
            <div className="h-5 w-full bg-white/5 rounded animate-pulse"></div>
            <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="flex justify-end mb-6">
        <div className="h-10 w-48 bg-primary/20 rounded-md animate-pulse shadow-[0_0_15px_rgba(0,255,200,0.1)]"></div>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative border border-border/40 bg-card rounded-xl p-6 shadow-sm flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-32 bg-white/10 rounded animate-pulse"></div>
                  {i < 2 && <div className="h-[18px] w-12 bg-white/5 rounded-full animate-pulse"></div>}
                </div>
                <div className="h-4 w-48 bg-white/5 rounded mt-2 animate-pulse"></div>
                <div className="h-4 w-32 bg-white/5 rounded mt-1 animate-pulse"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6 bg-white/5 w-fit px-3 py-1.5 rounded-md border border-white/5 relative z-10 animate-pulse">
               <div className="w-4 h-4 rounded-full bg-white/10"></div>
               <div className="h-5 w-24 bg-white/10 rounded"></div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 relative z-10">
                 {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-[18px] w-20 bg-primary/10 rounded animate-pulse"></div>
                 ))}
                 <div className="h-[18px] w-16 bg-white/5 rounded animate-pulse"></div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-border/30 pt-4 gap-2 relative z-10">
               {i < 2 ? (
                 <>
                   <div className="h-4 w-3/4 max-w-[200px] bg-white/5 rounded animate-pulse mr-auto"></div>
                   <div className="h-[28px] w-24 bg-white/10 rounded animate-pulse"></div>
                 </>
               ) : (
                 <>
                   <div className="h-[28px] w-16 bg-white/10 rounded animate-pulse"></div>
                   <div className="h-[28px] w-20 bg-white/10 rounded animate-pulse"></div>
                 </>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
