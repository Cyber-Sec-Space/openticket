import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { ShieldAlert, Server, Activity, Users, AlertTriangle, BarChart3 } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"

export default async function Home() {
  const session = await auth()

  if (!session?.user) return null

  // Metric computations for the dashboard
  const filterParams: any = {}
  if (session.user.role === 'REPORTER') filterParams.reporterId = session.user.id

  const totalIncidents = await db.incident.count({ where: filterParams })
  const criticalIncidents = await db.incident.count({ 
    where: { ...filterParams, severity: 'CRITICAL', status: { notIn: ['CLOSED', 'RESOLVED'] } } 
  })
  
  const totalAssets = await db.asset.count()
  const compromisedAssets = await db.asset.count({ where: { status: 'COMPROMISED' } })

  const severitiesData = await db.incident.groupBy({
    by: ['severity'],
    _count: { severity: true },
    where: filterParams
  })

  const chartMatrix = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
    const found = severitiesData.find(d => d.severity === sev)
    return { severity: sev, count: found ? found._count.severity : 0 }
  })

  // Fetch recent actionable incidents
  const recentIncidents = await db.incident.findMany({
    where: filterParams,
    orderBy: { createdAt: 'desc' },
    take: 4,
    include: { reporter: { select: { name: true, email: true } } }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, <span className="text-primary font-medium">{session.user.name || session.user.email}</span> [{session.user.role}]
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-full border border-primary/30 flex items-center bg-primary/10 text-primary animate-pulse">
            <Activity className="w-4 h-4 mr-2" /> Live
          </div>
        </div>
      </header>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ShieldAlert size={80} /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Incidents</p>
            <h3 className="text-4xl font-bold">{totalIncidents}</h3>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group border-destructive/30">
          <div className="absolute top-0 left-0 w-2 h-full bg-destructive shadow-[0_0_15px_var(--destructive)]" />
          <div className="absolute top-0 right-0 p-4 text-destructive opacity-10 group-hover:scale-110 transition-transform"><AlertTriangle size={80} /></div>
          <div className="pl-4">
            <p className="text-sm font-medium text-destructive/80 uppercase tracking-wider mb-2">Active Critical</p>
            <h3 className="text-4xl font-bold text-destructive">{criticalIncidents}</h3>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Server size={80} /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Assets</p>
            <h3 className="text-4xl font-bold">{totalAssets}</h3>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 text-orange-500 opacity-10 group-hover:scale-110 transition-transform"><Users size={80} /></div>
          <div>
            <p className="text-sm font-medium text-orange-400 uppercase tracking-wider mb-2">Compromised Assets</p>
            <h3 className="text-4xl font-bold text-orange-500">{compromisedAssets}</h3>
          </div>
        </div>
      </div>

      {/* Dynamic Analytics & Info Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden col-span-1 lg:col-span-2 shadow-2xl flex flex-col">
          <div className="p-5 border-b border-border/50 bg-black/20 flex items-center justify-between">
             <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Active Severity Triage Matrix
             </h3>
             <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-white/5 rounded-md border border-white/10">Live Telemetry</span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <DashboardCharts data={chartMatrix} />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Recent Activity */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-4 border-b border-border/50 bg-black/20">
               <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Recent Declarations
               </h3>
            </div>
            <div className="p-0 flex-1 divide-y divide-white/5">
              {recentIncidents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm font-medium">No recent incidents detected.</div>
              ) : (
                recentIncidents.map(inc => (
                  <Link href={`/incidents/${inc.id}`} key={inc.id} className="block group p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 pr-2">{inc.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm outline-hidden uppercase
                        ${inc.severity === 'CRITICAL' ? 'bg-destructive/20 text-red-400' :
                          inc.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          inc.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }
                      `}>
                        {inc.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{inc.reporter.name || "Unknown Operator"}</span>
                      <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions / Navigation */}
          <div className="border border-primary/20 bg-primary/5 rounded-xl flex flex-col justify-between p-5 shadow-[0_0_20px_rgba(0,100,255,0.05)]">
            <h2 className="text-sm font-bold tracking-widest text-primary/80 mb-3 uppercase">Command Actions</h2>
            <div className="space-y-2">
              <Link href="/incidents/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-primary/50 text-white rounded-lg transition-all">
                 <ShieldAlert className="w-4 h-4 mr-3 text-primary group-hover:scale-110 transition-transform" />
                 <div className="text-sm">
                   <strong className="block font-medium">Declare Incident</strong>
                 </div>
              </Link>
              <Link href="/assets/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-blue-400/50 text-white rounded-lg transition-all">
                 <Server className="w-4 h-4 mr-3 text-blue-400 group-hover:scale-110 transition-transform" />
                 <div className="text-sm">
                   <strong className="block font-medium">Catalog Infrastructure</strong>
                 </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
