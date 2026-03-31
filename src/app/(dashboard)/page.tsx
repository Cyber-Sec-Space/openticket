import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { ShieldAlert, Server, Activity, Users, AlertTriangle } from "lucide-react"

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

      {/* Quick Actions / Navigation */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/incidents" className="group p-8 glass-card flex flex-col items-center justify-center text-center rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(0,255,200,0.1)] transition-all">
            <ShieldAlert className="w-12 h-12 text-primary mb-4 group-hover:-translate-y-2 transition-transform duration-300" />
            <h3 className="text-xl font-semibold mb-2">Manage Incidents</h3>
            <p className="text-sm text-muted-foreground">View, update, and resolve ongoing security tickets.</p>
          </Link>
          <Link href="/assets" className="group p-8 glass-card flex flex-col items-center justify-center text-center rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(0,255,200,0.1)] transition-all">
            <Server className="w-12 h-12 text-blue-400 mb-4 group-hover:-translate-y-2 transition-transform duration-300" />
            <h3 className="text-xl font-semibold mb-2">Asset Inventory</h3>
            <p className="text-sm text-muted-foreground">Audit, maintain, and track IT infrastructure footprints.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
