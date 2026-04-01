import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { ShieldAlert, Server, Activity, Users, AlertTriangle, BarChart3, ScanFace, Target, Bug, ChevronLeft, ChevronRight, LayoutList } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { TrendChart } from "@/components/trend-chart"
import { IncidentRadarChart } from "@/components/incident-radar-chart"
import { VulnStatusChart } from "@/components/vuln-status-chart"
import { VulnSeverityChart } from "@/components/vuln-severity-chart"

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await (searchParams || { page: "1" });
  const currentPage = parseInt(page || "1", 10);
  const TAKE = 5;
  const skip = (currentPage - 1) * TAKE;

  const session = await auth()

  if (!session?.user) return null

  // Metric computations for the dashboard
  const filterParams: any = {}
  if (session.user.role === 'REPORTER') filterParams.reporterId = session.user.id

  const activeIncidents = await db.incident.count({ where: { ...filterParams, status: { notIn: ['CLOSED', 'RESOLVED'] } } })
  const criticalIncidents = await db.incident.count({
    where: { ...filterParams, severity: 'CRITICAL', status: { notIn: ['CLOSED', 'RESOLVED'] } }
  })

  const totalAssets = await db.asset.count()
  const compromisedAssets = await db.asset.count({ where: { status: 'COMPROMISED' } })

  const openVulns = await db.vulnerability.count({ where: { status: 'OPEN' } })
  const criticalVulns = await db.vulnerability.count({ where: { severity: 'CRITICAL', status: { not: 'RESOLVED' } } })

  const severitiesData = await db.incident.groupBy({
    by: ['severity'],
    _count: { severity: true },
    where: filterParams
  })

  const chartMatrix = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
    const found = severitiesData.find(d => d.severity === sev)
    return { severity: sev, count: found ? found._count.severity : 0 }
  })

  // Personal Case Board Logic
  const boardFilterParams: any = {
    status: { notIn: ['CLOSED', 'RESOLVED'] }
  };
  
  if (session.user.role !== 'REPORTER') {
    boardFilterParams.OR = [
      { reporterId: session.user.id },
      { assignees: { some: { id: session.user.id } } },
      { assignees: { none: {} } }
    ]
  } else {
    boardFilterParams.OR = [
      { reporterId: session.user.id },
      { assignees: { some: { id: session.user.id } } }
    ]
  }

  const [boardIncidents, boardTotal] = await Promise.all([
    db.incident.findMany({
      where: boardFilterParams,
      orderBy: { createdAt: 'desc' },
      take: TAKE,
      skip,
      include: { reporter: { select: { name: true, email: true } } }
    }),
    db.incident.count({ where: boardFilterParams })
  ]);
  const totalPages = Math.ceil(boardTotal / TAKE);

  // 14 Days Trend Calculation
  const trendDays = 14;
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - trendDays);

  const allIncsForTrend = await db.incident.findMany({
    where: filterParams,
    select: { createdAt: true, updatedAt: true, status: true }
  });

  const allVulnsForTrend = await db.vulnerability.findMany({
    select: { createdAt: true, updatedAt: true, status: true }
  });

  const trendData = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const dStart = new Date(now);
    dStart.setDate(dStart.getDate() - i);
    dStart.setHours(0, 0, 0, 0);

    const dEnd = new Date(dStart);
    dEnd.setHours(23, 59, 59, 999);

    const dateStr = dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Active at the end of the day
    const activeInc = allIncsForTrend.filter(inc =>
      inc.createdAt <= dEnd &&
      (!['RESOLVED', 'CLOSED'].includes(inc.status) || inc.updatedAt > dEnd)
    ).length;

    const activeVuln = allVulnsForTrend.filter(v =>
      v.createdAt <= dEnd &&
      (!['RESOLVED', 'MITIGATED'].includes(v.status) || v.updatedAt > dEnd)
    ).length;

    // Resolved ON this day
    const resolvedInc = allIncsForTrend.filter(inc =>
      ['RESOLVED', 'CLOSED'].includes(inc.status) &&
      inc.updatedAt >= dStart && inc.updatedAt <= dEnd
    ).length;

    const resolvedVuln = allVulnsForTrend.filter(v =>
      ['RESOLVED', 'MITIGATED'].includes(v.status) &&
      v.updatedAt >= dStart && v.updatedAt <= dEnd
    ).length;

    const incResolveRate = (activeInc + resolvedInc) > 0 ? (resolvedInc / (activeInc + resolvedInc)) * 100 : 0;
    const vulnResolveRate = (activeVuln + resolvedVuln) > 0 ? (resolvedVuln / (activeVuln + resolvedVuln)) * 100 : 0;

    trendData.push({
      date: dateStr,
      incidents: activeInc,
      vulnerabilities: activeVuln,
      incResolveRate: parseFloat(incResolveRate.toFixed(1)),
      vulnResolveRate: parseFloat(vulnResolveRate.toFixed(1))
    });
  }

  // Active Incident Typology & Severity for Radar Chart
  const activeIncidentsList = await db.incident.findMany({
    where: { ...filterParams, status: { notIn: ['CLOSED', 'RESOLVED'] } },
    select: { type: true, severity: true }
  });

  const types = ['MALWARE', 'PHISHING', 'DATA_BREACH', 'UNAUTHORIZED_ACCESS', 'NETWORK_ANOMALY', 'OTHER'];
  const incidentRadarData = types.map(type => {
    const forType = activeIncidentsList.filter(inc => inc.type === type);
    return {
      type: type.replace(/_/g, ' '),
      CRITICAL: forType.filter(inc => inc.severity === 'CRITICAL').length,
      HIGH: forType.filter(inc => inc.severity === 'HIGH').length,
      MEDIUM: forType.filter(inc => inc.severity === 'MEDIUM').length,
      LOW: forType.filter(inc => inc.severity === 'LOW').length,
      total: forType.length
    };
  });

  // Vulnerability Aggregation (Not filtered by REPORTER strictly to show total org exposure)
  const vulnStatusData = await db.vulnerability.groupBy({
    by: ['status'], _count: { status: true }
  })
  const vulnStatusMatrix = ['OPEN', 'MITIGATED', 'RESOLVED'].map(st => {
    const found = vulnStatusData.find(d => d.status === st)
    return { status: st, count: found ? found._count.status : 0 }
  })

  const vulnSeverityData = await db.vulnerability.groupBy({
    by: ['severity'], _count: { severity: true }, where: { status: { not: 'RESOLVED' } }
  })
  const vulnSeverityMatrix = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
    const found = vulnSeverityData.find(d => d.severity === sev)
    return { severity: sev, count: found ? found._count.severity : 0 }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ShieldAlert size={80} /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Incidents</p>
            <h3 className="text-4xl font-bold">{activeIncidents}</h3>
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
          <div className="absolute top-0 right-0 p-4 text-purple-500 opacity-10 group-hover:scale-110 transition-transform"><Target size={80} /></div>
          <div>
            <p className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-2">Open Vulns</p>
            <h3 className="text-4xl font-bold text-purple-500">{openVulns}</h3>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between rounded-xl relative overflow-hidden group border-indigo-500/30">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]" />
          <div className="absolute top-0 right-0 p-4 text-indigo-500 opacity-10 group-hover:scale-110 transition-transform"><ScanFace size={80} /></div>
          <div className="pl-4">
            <p className="text-sm font-medium text-indigo-400 uppercase tracking-wider mb-2">Critical CVEs</p>
            <h3 className="text-4xl font-bold text-indigo-500">{criticalVulns}</h3>
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
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Core Analytics Column */}
        <div className="col-span-1 xl:col-span-2 flex flex-col gap-8">

          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-border/50 bg-black/20 flex items-center justify-between">
              <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Detection Trend
              </h3>
              <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-white/5 rounded-md border border-white/10">Past 14 Days</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center min-h-[320px]">
              <TrendChart data={trendData} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Incident Severity */}
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col bg-rose-950/10">
              <div className="p-5 border-b border-rose-500/20 bg-rose-500/5">
                <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-rose-400" />
                  Active Incident Severity Matrix
                </h3>
              </div>
              <div className="p-4 flex-1 min-h-[320px] flex items-center justify-center">
                <DashboardCharts data={chartMatrix} />
              </div>
            </div>

            {/* Incident Radar */}
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col bg-rose-950/10">
              <div className="p-5 border-b border-rose-500/20 bg-rose-500/5">
                <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Active Incident Typology Distribution
                </h3>
              </div>
              <div className="p-4 flex-1 min-h-[320px] flex items-center justify-center">
                <IncidentRadarChart data={incidentRadarData} />
              </div>
            </div>

            {/* Vuln Radar */}
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col bg-indigo-950/10">
              <div className="p-5 border-b border-indigo-500/20 bg-indigo-500/5">
                <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-indigo-400" />
                  Threat Vector Distribution
                </h3>
              </div>
              <div className="p-4 flex-1 min-h-[320px] flex items-center justify-center">
                <VulnSeverityChart data={vulnSeverityMatrix} />
              </div>
            </div>

            {/* Vuln Donut */}
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
              <div className="p-5 border-b border-border/50 bg-black/20">
                <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <ScanFace className="w-4 h-4 text-emerald-400" />
                  Vulnerability Resolution Status
                </h3>
              </div>
              <div className="p-4 flex-1 min-h-[320px] flex items-center justify-center">
                <VulnStatusChart data={vulnStatusMatrix} />
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Personal Case Board */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-4 border-b border-border/50 bg-black/20 flex items-center justify-between">
              <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                <LayoutList className="w-4 h-4 text-emerald-400" />
                Your Action Board
              </h3>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">{boardTotal} Active</span>
            </div>
            <div className="p-0 flex-1 divide-y divide-white/5 flex flex-col min-h-[400px]">
              {boardIncidents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm font-medium flex-1 flex items-center justify-center">No active tasks in your queue.</div>
              ) : (
                <div className="flex-1">
                  {boardIncidents.map(inc => {
                    const isOverdue = inc.targetSlaDate && 
                      new Date() > inc.targetSlaDate && 
                      !['RESOLVED', 'CLOSED'].includes(inc.status);
                    
                    return (
                    <Link href={`/incidents/${inc.id}`} key={inc.id} className={`block group p-4 transition-colors relative overflow-hidden ${isOverdue ? 'hover:bg-red-950/20 bg-red-950/5' : 'hover:bg-white/5'}`}>
                      {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-pulse" />}
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-1">
                        <span className={`font-semibold text-sm transition-colors line-clamp-1 pr-2 ${isOverdue ? 'text-red-400 group-hover:text-red-300' : 'group-hover:text-primary'}`}>
                          {isOverdue && <AlertTriangle className="inline w-3 h-3 mr-1 text-red-500 animate-pulse" />}
                          {inc.title}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm outline-hidden uppercase shrink-0
                          ${inc.severity === 'CRITICAL' ? 'bg-destructive/20 text-red-400' :
                            inc.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                              inc.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-emerald-500/20 text-emerald-400'
                          }
                        `}>
                          {inc.severity.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs mt-2">
                        <span className={isOverdue ? 'text-red-400/70 line-clamp-1' : 'text-muted-foreground line-clamp-1'}>
                          Reporter: {inc.reporter?.name || "Deleted"}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm outline-hidden uppercase shrink-0 border
                            ${inc.status === 'NEW' ? 'bg-blue-500/10 border-blue-400/30 text-blue-400' :
                              inc.status === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-400/30 text-amber-400' :
                              'bg-indigo-500/10 border-indigo-400/30 text-indigo-400'
                            }`}>
                            {inc.status.replace(/_/g, ' ')}
                          </span>
                          <span className={isOverdue ? 'text-red-500 font-bold' : 'text-muted-foreground'}>
                            {inc.targetSlaDate ? new Date(inc.targetSlaDate).toLocaleDateString() : new Date(inc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )})}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-white/5 flex items-center justify-between bg-black/40 mt-auto">
                   <Link 
                     href={currentPage <= 1 ? '#' : `?page=${currentPage - 1}`} 
                     className={`flex items-center text-xs px-3 py-1.5 rounded-md border border-white/10 transition-colors ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-white/10 hover:border-white/20'}`}
                   >
                     <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                   </Link>
                   <span className="text-xs font-mono text-muted-foreground">P. {currentPage} / {totalPages}</span>
                   <Link 
                     href={currentPage >= totalPages ? '#' : `?page=${currentPage + 1}`}
                     className={`flex items-center text-xs px-3 py-1.5 rounded-md border border-white/10 transition-colors ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-white/10 hover:border-white/20'}`}
                   >
                     Next <ChevronRight className="w-4 h-4 ml-1" />
                   </Link>
                </div>
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
              {(session.user.role === 'ADMIN' || session.user.role === 'SECOPS') && (
                <Link href="/vulnerabilities/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-purple-400/50 text-white rounded-lg transition-all">
                  <Bug className="w-4 h-4 mr-3 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <strong className="block font-medium">Log Vulnerability</strong>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
