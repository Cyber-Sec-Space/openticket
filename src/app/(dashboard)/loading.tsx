import { Activity, BarChart3, ScanFace, ShieldAlert, Target, LayoutList } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-white/10 rounded-md animate-pulse w-48">System Status</h1>
          <p className="text-muted-foreground mt-2 text-transparent bg-white/5 rounded-md animate-pulse w-64">
            Welcome, Placeholder Name Loading
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-full border border-primary/20 flex items-center bg-primary/5 text-transparent animate-pulse select-none">
            <Activity className="w-4 h-4 mr-2 opacity-0" /> Live
          </div>
        </div>
      </header>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden border-white/5">
            <div className="flex z-10 flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-transparent bg-white/10 rounded animate-pulse w-20 tracking-wider uppercase line-clamp-1">LOADING..</p>
              </div>
              <h3 className="text-3xl font-black text-transparent bg-white/20 rounded animate-pulse w-12">00</h3>
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
              <h3 className="text-transparent font-semibold tracking-wide flex items-center gap-2 bg-white/10 rounded animate-pulse">
                <BarChart3 className="w-5 h-5 opacity-0 mr-1" />
                Detection Trend Placeholder
              </h3>
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <div className="px-3 py-1 text-xs font-bold text-transparent bg-white/5 rounded-md animate-pulse">14D Range</div>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center min-h-[320px] h-[320px]">
               {/* Pulsing grid lines mock */}
               <div className="w-full h-full flex items-end justify-between gap-2 opacity-20">
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
                <div className="p-5 border-b border-white/5 bg-black/10">
                  <h3 className="text-transparent font-semibold tracking-wide flex items-center gap-2 text-sm bg-white/10 rounded animate-pulse w-48">
                    <div className="h-4 w-4 rounded-full opacity-0"></div>
                    Chart Title Placeholder
                  </h3>
                </div>
                <div className="p-4 flex-1 min-h-[320px] h-[320px] flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-[10px] border-white/5 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Quick Actions / Navigation Skeleton */}
          <div className="border border-white/5 bg-black/20 rounded-xl flex flex-col justify-between p-5 shadow-[0_0_20px_rgba(255,255,255,0.02)] shrink-0">
            <h2 className="text-sm font-bold tracking-widest text-transparent bg-white/10 rounded uppercase mb-3 animate-pulse w-32">Command Actions</h2>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center p-3 bg-black/50 border border-white/5 rounded-lg">
                  <div className="w-4 h-4 mr-3 rounded-full bg-white/10 animate-pulse"></div>
                  <div className="text-sm w-full">
                    <strong className="block font-medium text-transparent bg-white/10 rounded animate-pulse w-2/3">Declare Incident Block</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Case Board Skeleton */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1 min-h-[400px]">
            <div className="p-4 border-b border-border/50 bg-black/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white/30 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <LayoutList className="w-4 h-4 opacity-50" />
                  <div className="text-transparent bg-white/10 rounded animate-pulse">Your Action Board Placeholder</div>
                </h3>
                <span className="text-xs bg-white/5 text-transparent px-2 py-0.5 rounded-full font-mono animate-pulse">0 Active</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                 <div className="px-2 py-1 rounded bg-white/5 text-transparent animate-pulse">All Filter</div>
                 <div className="px-2 py-1 rounded bg-white/5 text-transparent animate-pulse">Assigned Filter</div>
                 <div className="px-2 py-1 rounded bg-white/5 text-transparent animate-pulse">Unassigned F</div>
              </div>
            </div>
            <div className="p-0 flex-1 divide-y divide-white/5 flex flex-col min-h-[400px]">
               {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="block p-4 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-1">
                      <span className="font-semibold text-sm text-transparent bg-white/10 rounded animate-pulse w-3/4 max-w-[250px]">Placeholder Ticket Title Layout Struct</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-transparent bg-white/5 animate-pulse uppercase shrink-0">CRITICAL</span>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs mt-2">
                      <span className="text-transparent bg-white/5 rounded animate-pulse w-32">Reporter: Placeholder N</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-transparent bg-white/5 animate-pulse shrink-0 border border-transparent">IN PROGRESS</span>
                        <span className="text-transparent bg-white/5 rounded animate-pulse font-bold">1/1/2026</span>
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
