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

  // Phase 7: Analytics Computations
  const severitiesData = await db.incident.groupBy({
    by: ['severity'],
    _count: { severity: true },
    where: filterParams
  })

  // Format array explicitly mapping missing elements if needed
  const chartMatrix = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
    const found = severitiesData.find(d => d.severity === sev)
    return { severity: sev, count: found ? found._count.severity : 0 }
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

      {/* Phase 7: Dynamic Analytics Chart */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden col-span-1 lg:col-span-2 shadow-2xl">
          <div className="p-5 border-b border-border/50 bg-black/10">
             <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Active Triage Breakdown 
             </h3>
          </div>
          <div className="p-6">
            <DashboardCharts data={chartMatrix} />
          </div>
        </div>

        {/* Quick Actions / Navigation */}
        <div className="col-span-1 border border-primary/20 bg-primary/5 rounded-xl flex flex-col justify-between p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary mb-4">Command Actions</h2>
            <div className="space-y-3">
              <Link href="/incidents/new" className="group flex items-center p-4 bg-black/40 hover:bg-black border border-white/5 hover:border-primary/50 text-white rounded-lg transition-all shadow-xl">
                 <ShieldAlert className="w-5 h-5 mr-3 text-primary group-hover:scale-110" />
                 <div className="text-sm">
                   <strong className="block font-semibold">Declare Incident</strong>
                   <span className="text-xs text-muted-foreground">Log security anomaly</span>
                 </div>
              </Link>
              <Link href="/assets/new" className="group flex items-center p-4 bg-black/40 hover:bg-black border border-white/5 hover:border-blue-400/50 text-white rounded-lg transition-all shadow-xl">
                 <Server className="w-5 h-5 mr-3 text-blue-400 group-hover:scale-110" />
                 <div className="text-sm">
                   <strong className="block font-semibold">Catalog Infrastructure</strong>
                   <span className="text-xs text-muted-foreground">Bind server mapping</span>
                 </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
