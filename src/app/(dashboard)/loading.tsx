import { Activity, BarChart3, ScanFace, ShieldAlert, Target, LayoutList } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="h-[40px] w-48 bg-white/10 rounded-md animate-pulse"></div>
          <div className="h-[24px] w-64 bg-white/5 rounded-md mt-2 animate-pulse"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-[40px] w-24 rounded-full border border-primary/20 bg-primary/5 animate-pulse"></div>
        </div>
      </header>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Row 1: Cards 1-4 (No Delta) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`row1-${i}`} className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden border-white/5">
            <div className="flex z-10 flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="h-[14px] w-20 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="h-[36px] w-12 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        ))}
        {/* Row 2: Cards 5-8 (With Delta Chip - 20px height) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`row2-${i}`} className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden border-white/5">
            <div className="flex z-10 flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="h-[14px] w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-[20px] w-12 bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="h-[36px] w-12 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Analytics & Info Grid Skeleton */}
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Core Analytics Column */}
        <div className="col-span-1 xl:col-span-2 flex flex-col gap-8">
          
          {/* Main Trend Chart */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-border/50 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 opacity-20" />
                <div className="h-[24px] w-40 bg-white/10 rounded animate-pulse"></div>
              </div>
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <div className="h-[24px] w-24 bg-white/5 rounded-md animate-pulse"></div>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center min-h-[320px]">
               {/* Pulsing grid lines mock matching TrendChart dimensions */}
               <div className="w-full h-80 flex items-end justify-between gap-2 opacity-20">
                  {Array.from({ length: 14 }).map((_, j) => (
                     <div key={j} className="w-full bg-white/10 rounded-t animate-pulse" style={{ height: `${Math.random() * 60 + 20}%`}}></div>
                  ))}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 4 Mini Charts */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col bg-black/20">
                <div className="p-5 border-b border-white/5 bg-black/10 flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-white/10 animate-pulse"></div>
                  <div className="h-[20px] w-48 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="p-4 flex-1 min-h-[320px] flex items-center justify-center">
                  <div className="w-full h-80 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border-[10px] border-white/5 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Quick Actions / Navigation Skeleton */}
          <div className="border border-white/5 bg-black/20 rounded-xl flex flex-col justify-between p-5 shadow-[0_0_20px_rgba(255,255,255,0.02)] shrink-0">
            <div className="h-[20px] w-32 bg-white/10 rounded mb-3 animate-pulse"></div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center p-3 bg-black/50 border border-white/5 rounded-lg">
                  <div className="w-4 h-4 mr-3 rounded-full bg-white/10 animate-pulse"></div>
                  <div className="h-[20px] w-2/3 bg-white/10 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Case Board Skeleton */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1 min-h-[400px]">
            <div className="p-4 border-b border-border/50 bg-black/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutList className="w-4 h-4 opacity-30" />
                  <div className="h-[20px] w-32 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="h-[16px] w-16 bg-white/5 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-wrap gap-2">
                 <div className="h-[20px] w-12 bg-white/5 rounded animate-pulse"></div>
                 <div className="h-[20px] w-24 bg-white/5 rounded animate-pulse"></div>
                 <div className="h-[20px] w-28 bg-white/5 rounded animate-pulse"></div>
                 <div className="h-[20px] w-20 bg-white/5 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="p-0 flex-1 divide-y divide-white/5 flex flex-col min-h-[400px]">
               {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="block p-4 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-1">
                      <div className="h-[20px] w-3/4 max-w-[250px] bg-white/10 rounded animate-pulse"></div>
                      <div className="h-[14px] w-16 bg-white/5 rounded-sm animate-pulse shrink-0"></div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                      <div className="h-[16px] w-32 bg-white/5 rounded animate-pulse"></div>
                      <div className="flex items-center gap-3">
                        <div className="h-[14px] w-20 bg-white/5 rounded-sm animate-pulse shrink-0 border border-transparent"></div>
                        <div className="h-[16px] w-16 bg-white/5 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
