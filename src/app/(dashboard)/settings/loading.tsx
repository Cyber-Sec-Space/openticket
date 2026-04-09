import { UserCog, KeyRound, Bell } from "lucide-react"

export default function SettingsLoading() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserCog className="w-8 h-8 mr-3 text-blue-400/30 animate-pulse" /> 
            <div className="h-9 w-64 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="mt-2 h-5 w-48 bg-white/5 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-3">
           <div className="h-8 w-[100px] bg-purple-600/20 rounded-lg animate-pulse"></div>
        </div>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <div className="border-b border-white/5 bg-black/20 p-6 grid auto-rows-min gap-1">
          <div className="h-[22px] w-48 bg-white/10 rounded animate-pulse"></div>
          <div className="h-[20px] w-64 bg-white/5 rounded animate-pulse"></div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
              <div className="h-8 w-full bg-white/5 rounded-lg animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
              <div className="h-8 w-full bg-white/5 rounded-lg animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-white/5 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-full bg-white/10 rounded-lg animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <div className="h-4 w-56 bg-white/5 rounded animate-pulse"></div>
              <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse flex justify-between items-center px-3 border border-white/5">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>

            <div className="h-8 w-32 bg-blue-600/20 rounded-lg animate-pulse"></div>
          </div>

          <div className="pt-4">
            {/* Mock Two Factor Panel */}
            <div className="space-y-6">
              <hr className="my-8 border-white/10" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="flex items-center text-sm font-semibold uppercase tracking-widest text-primary/30">
                    <KeyRound className="w-4 h-4 mr-2" />
                    <div className="h-5 w-36 bg-white/10 rounded animate-pulse"></div>
                  </h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="h-4 w-3/4 max-w-[400px] bg-white/5 rounded animate-pulse"></div>
                    <div className="h-4 w-1/2 max-w-[250px] bg-white/5 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-28 bg-white/10 rounded-md animate-pulse"></div>
                    <div className="h-8 w-24 bg-emerald-600/20 rounded shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mock Notification Panel */}
            <div className="mt-8 border-t border-white/10 pt-8 space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-blue-400/30 animate-pulse" />
                <div className="h-7 w-48 bg-white/10 rounded animate-pulse"></div>
              </div>

              <div className="p-5 bg-black/30 border border-white/5 rounded-xl space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-5 w-40 bg-white/10 rounded animate-pulse"></div>
                    <div className="flex flex-col gap-1 mt-1">
                       <div className="h-4 w-3/4 max-w-[280px] bg-white/5 rounded animate-pulse"></div>
                       <div className="h-4 w-1/2 max-w-[200px] bg-white/5 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-8 w-[140px] bg-white/10 rounded-lg animate-pulse shrink-0"></div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-black/40 rounded-lg border border-white/5">
                           <div className="w-4 h-4 rounded bg-white/10 animate-pulse shrink-0"></div>
                           <div className="h-5 w-32 bg-white/5 rounded animate-pulse"></div>
                        </div>
                      ))}
                   </div>
                   <div className="h-7 w-[120px] bg-blue-600/20 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
