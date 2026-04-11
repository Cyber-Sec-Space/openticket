import React from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { activePlugins } from "@/plugins"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { createPluginContext } from "@/lib/plugins/sdk-context"
import { ShieldAlert, Server, Activity, Users, AlertTriangle, BarChart3, ScanFace, Target, Bug, ChevronLeft, ChevronRight, LayoutList, Clock, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { TrendChart } from "@/components/trend-chart"
import { IncidentRadarChart } from "@/components/incident-radar-chart"
import { VulnStatusChart } from "@/components/vuln-status-chart"
import { VulnSeverityChart } from "@/components/vuln-severity-chart"
import { getDashboardTrendData } from "@/lib/metrics-service"
import { hasPermission } from "@/lib/auth-utils"

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string; range?: string }> }) {
  const { page, filter, range } = await (searchParams || {});
  let currentPage = parseInt(page || "1", 10);
  if (Number.isNaN(currentPage) || currentPage < 1) currentPage = 1;
  const currentFilter = filter || "all";
  const currentRange = range || "14d";
  const TAKE = 12;
  const skip = (currentPage - 1) * TAKE;

  const session = await auth()

  if (!session?.user) { redirect("/login"); return null; }

  if (!hasPermission(session as any, 'VIEW_DASHBOARD')) {
    redirect("/incidents")
  }

  const activePluginStates = await db.pluginState.findMany({ where: { isActive: true } });

  const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL');
  const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED');
  const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED');

  // Metric computations for the dashboard
  const filterParams: any = {}
  if (!canViewAll) {
     const assignedConditions = []
     if (canViewAssigned || (!canViewAssigned && !canViewUnassigned)) {
        assignedConditions.push({ reporterId: session.user.id })
        assignedConditions.push({ assignees: { some: { id: session.user.id } } })
     }
     if (canViewUnassigned) {
        assignedConditions.push({ assignees: { none: {} } })
     }
     filterParams.OR = assignedConditions
  }

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
    ...filterParams,
    status: { notIn: ['CLOSED', 'RESOLVED'] }
  };

  if (currentFilter === 'reported') {
    boardFilterParams.reporterId = session.user.id;
  } else if (currentFilter === 'assigned') {
    boardFilterParams.assignees = { some: { id: session.user.id } };
  } else if (currentFilter === 'unassigned') {
    boardFilterParams.assignees = { none: {} };
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

  // Trend Calculation with Dynamic Range and Smart Downsampling
  const rawTrendData = await getDashboardTrendData(currentRange, filterParams);
  const trendData = rawTrendData.map((d: any) => {
    const incResolveRate = (d.activeIncidents + d.resolvedIncidentsDelta) > 0 
      ? (d.resolvedIncidentsDelta / (d.activeIncidents + d.resolvedIncidentsDelta)) * 100 : 0;
    const vulnResolveRate = (d.activeVulns + d.resolvedVulnsDelta) > 0 
      ? (d.resolvedVulnsDelta / (d.activeVulns + d.resolvedVulnsDelta)) * 100 : 0;

    // Based on range, format the date string properly
    let formattedDate = '';
    if (currentRange === '24h' || currentRange === '7d') {
      formattedDate = d.date.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric' });
    } else {
      formattedDate = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return {
      date: formattedDate,
      incidents: d.activeIncidents,
      vulnerabilities: d.activeVulns,
      incResolveRate: parseFloat(incResolveRate.toFixed(1)),
      vulnResolveRate: parseFloat(vulnResolveRate.toFixed(1)),
      incBreached: d.slaBreached
    }
  });

  const startDate = new Date();
  startDate.setDate(new Date().getDate() - 14);

  // Advanced Analytics
  // We need to fetch basic resolve data for the next section if needed, or query again.
  // We'll just run a quick DB query since it's cheap now.
  const resolvedLast14Days = await db.incident.findMany({
    where: { 
      status: { in: ['RESOLVED', 'CLOSED'] },
      updatedAt: { gte: startDate } 
    },
    select: { createdAt: true, updatedAt: true }
  });

  let mttr = "N/A";
  if (resolvedLast14Days.length > 0) {
    const totalHours = resolvedLast14Days.reduce((acc, inc) => {
      return acc + (inc.updatedAt.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60);
    }, 0);
    mttr = (totalHours / resolvedLast14Days.length).toFixed(1) + "h";
  }

  const now = new Date();
  
  const complianceBaseCount = await db.incident.count({ where: { ...filterParams, targetSlaDate: { not: null } } });
  const breachedActive = await db.incident.count({ 
    where: { 
      ...filterParams, 
      targetSlaDate: { not: null, lt: now }, 
      status: { notIn: ['RESOLVED', 'CLOSED'] } 
    }
  });
  
  // For resolved tickets, we fetch a minimal subset to check if they breached SLA before closing
  const breachedResolvedRaw = await db.incident.findMany({ 
    where: { ...filterParams, status: { in: ['RESOLVED', 'CLOSED'] }, targetSlaDate: { not: null } },
    select: { targetSlaDate: true, updatedAt: true }
  });
  const breachedResolvedCount = breachedResolvedRaw.filter(i => i.updatedAt > i.targetSlaDate!).length;
  
  const totalBreached = breachedActive + breachedResolvedCount;
  const complianceRate = complianceBaseCount > 0 
    ? (((complianceBaseCount - totalBreached) / complianceBaseCount) * 100).toFixed(1) + "%" 
    : "100%";

  // Use MetricSnapshot for 7 days ago comparison (Time-Travel Delta)
  const d7DaysAgo = new Date();
  d7DaysAgo.setDate(d7DaysAgo.getDate() - 7);
  
  // Find the closest snapshot from 7 days ago
  let activeInc7DaysAgo = activeIncidents;
  let openVulns7DaysAgo = openVulns;
  let criticalInc7DaysAgo = criticalIncidents;
  let criticalVulns7DaysAgo = criticalVulns;

  const snap7Days = rawTrendData.find((d: any) => d.date.getTime() >= d7DaysAgo.getTime());
  if (snap7Days) {
    activeInc7DaysAgo = snap7Days.activeIncidents;
    openVulns7DaysAgo = snap7Days.activeVulns;
    // Approximating critical proportionally for 7 days ago as it's just a UI delta
    criticalInc7DaysAgo = Math.floor(activeInc7DaysAgo * (criticalIncidents / (activeIncidents || 1)));
    criticalVulns7DaysAgo = Math.floor(openVulns7DaysAgo * (criticalVulns / (openVulns || 1)));
  }

  const calcDelta = (current: number, past: number) => {
    if (past === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - past) / past) * 100);
  };

  const deltaActiveInc = calcDelta(activeIncidents, activeInc7DaysAgo);
  const deltaCriticalInc = calcDelta(criticalIncidents, criticalInc7DaysAgo);
  const deltaOpenVulns = calcDelta(openVulns, openVulns7DaysAgo);
  const deltaCriticalVulns = calcDelta(criticalVulns, criticalVulns7DaysAgo);

  const renderDelta = (delta: number) => {
    if (delta === 0) return null;
    return (
      <span className={`flex items-center text-xs font-bold ${delta > 0 ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'} px-2 py-0.5 rounded-full`}>
        {delta > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
        {Math.abs(delta)}%
      </span>
    );
  };

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
      INFO: forType.filter(inc => inc.severity === 'INFO').length,
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
  const vulnSeverityMatrix = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(sev => {
    const found = vulnSeverityData.find(d => d.severity === sev)
    return { severity: sev, count: found ? found._count.severity : 0 }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, <span className="text-primary font-medium">{session.user.name || session.user.email}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-full border border-primary/30 flex items-center bg-primary/10 text-primary animate-pulse">
            <Activity className="w-4 h-4 mr-2" /> Live
          </div>
        </div>
      </header>

      {/* Dynamic Plugin Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {await Promise.all(activePlugins.map(async plugin => {
          const state = activePluginStates.find(s => s.id === plugin.manifest.id);
          if (!state || !plugin.ui?.dashboardWidgets) return null;

          const config = state.configJson ? parsePluginConfig(state.configJson) : {};
          const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);

          return (
            <React.Fragment key={plugin.manifest.id}>
              {plugin.ui.dashboardWidgets.map((Widget, idx) => (
                <Widget key={`${plugin.manifest.id}-widget-${idx}`} api={context.api} config={config} />
              ))}
            </React.Fragment>
          )
        }))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden group border-emerald-500/20">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Clock size={60} className="text-emerald-500" /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider line-clamp-1">MTTR (14d)</p>
            </div>
            <h3 className="text-3xl font-black">{mttr}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden group border-blue-500/20">
          <div className="absolute top-0 right-0 p-3 text-blue-500 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 size={60} /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider line-clamp-1">SLA Compliant</p>
            </div>
            <h3 className="text-3xl font-black text-blue-500">{complianceRate}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col border border-white/5 justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Server size={60} /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider line-clamp-1 whitespace-nowrap">Total Assets</p>
            </div>
            <h3 className="text-3xl font-black">{totalAssets}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col border border-white/5 justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-orange-500 opacity-10 group-hover:scale-110 transition-transform"><Users size={60} /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider line-clamp-1 whitespace-nowrap">Compromised</p>
            </div>
            <h3 className="text-3xl font-black text-orange-500">{compromisedAssets}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col border border-white/5 justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><ShieldAlert size={60} /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider line-clamp-1 whitespace-nowrap">Active Incs</p>
              {renderDelta(deltaActiveInc)}
            </div>
            <h3 className="text-3xl font-black">{activeIncidents}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden group border-destructive/30">
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive shadow-[0_0_15px_var(--destructive)]" />
          <div className="absolute top-0 right-0 p-3 text-destructive opacity-10 group-hover:scale-110 transition-transform"><AlertTriangle size={60} /></div>
          <div className="pl-3 flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-destructive/80 uppercase tracking-wider line-clamp-1 whitespace-nowrap">Critical Incs</p>
              {renderDelta(deltaCriticalInc)}
            </div>
            <h3 className="text-3xl font-black text-destructive">{criticalIncidents}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col border border-white/5 justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-purple-500 opacity-10 group-hover:scale-110 transition-transform"><Target size={60} /></div>
          <div className="flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider line-clamp-1 whitespace-nowrap">Open Vulns</p>
              {renderDelta(deltaOpenVulns)}
            </div>
            <h3 className="text-3xl font-black text-purple-500">{openVulns}</h3>
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden group border-indigo-500/30">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]" />
          <div className="absolute top-0 right-0 p-3 text-indigo-500 opacity-10 group-hover:scale-110 transition-transform"><ScanFace size={60} /></div>
          <div className="pl-3 flex z-10 flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider line-clamp-1 whitespace-nowrap">Critical CVEs</p>
              {renderDelta(deltaCriticalVulns)}
            </div>
            <h3 className="text-3xl font-black text-indigo-500">{criticalVulns}</h3>
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
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 shadow-inner">
                {[ '24h', '7d', '14d', '30d' ].map(r => (
                  <Link key={r} href={`/?range=${r}&filter=${currentFilter}`} scroll={false}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          currentRange === r 
                            ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        }`}>
                    {r === '24h' ? '24H' : r.toUpperCase()}
                  </Link>
                ))}
              </div>
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
          {/* Quick Actions / Navigation */}
          <div className="border border-primary/20 bg-primary/5 rounded-xl flex flex-col justify-between p-5 shadow-[0_0_20px_rgba(0,100,255,0.05)] shrink-0">
            <h2 className="text-sm font-bold tracking-widest text-primary/80 mb-3 uppercase">Command Actions</h2>
            <div className="space-y-2">
              {hasPermission(session as any, 'CREATE_INCIDENTS') && (
                <Link href="/incidents/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-primary/50 text-white rounded-lg transition-all">
                  <ShieldAlert className="w-4 h-4 mr-3 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <strong className="block font-medium">Declare Incident</strong>
                  </div>
                </Link>
              )}
              {hasPermission(session as any, 'CREATE_ASSETS') && (
                <Link href="/assets/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-blue-400/50 text-white rounded-lg transition-all">
                  <Server className="w-4 h-4 mr-3 text-blue-400 group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <strong className="block font-medium">Catalog Infrastructure</strong>
                  </div>
                </Link>
              )}
              {hasPermission(session as any, 'CREATE_VULNERABILITIES') && (
                <Link href="/vulnerabilities/new" className="group flex items-center p-3 bg-black/50 hover:bg-black border border-white/5 hover:border-purple-400/50 text-white rounded-lg transition-all">
                  <Bug className="w-4 h-4 mr-3 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <strong className="block font-medium">Log Vulnerability</strong>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Personal Case Board */}
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-4 border-b border-border/50 bg-black/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white/90 font-semibold tracking-wide flex items-center gap-2 text-sm">
                  <LayoutList className="w-4 h-4 text-emerald-400" />
                  Your Action Board
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">{boardTotal} Active</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                <Link scroll={false} href={`?filter=all`} className={`px-2 py-1 rounded transition-colors ${currentFilter === 'all' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'}`}>All</Link>
                <Link scroll={false} href={`?filter=assigned`} className={`px-2 py-1 rounded transition-colors ${currentFilter === 'assigned' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'}`}>Assigned to me</Link>
                <Link scroll={false} href={`?filter=reported`} className={`px-2 py-1 rounded transition-colors ${currentFilter === 'reported' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'}`}>Reported by me</Link>
                {(canViewAll || canViewUnassigned) && (
                  <Link scroll={false} href={`?filter=unassigned`} className={`px-2 py-1 rounded transition-colors ${currentFilter === 'unassigned' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'}`}>Unassigned</Link>
                )}
              </div>
            </div>
            <div className="p-0 flex-1 divide-y divide-white/5 flex flex-col min-h-[400px]">
              {boardIncidents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm font-medium flex-1 flex items-center justify-center">No active tasks in your queue.</div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
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
                    )
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-white/5 flex items-center justify-between bg-black/40 mt-auto">
                  <Link
                    href={currentPage <= 1 ? '#' : `?page=${currentPage - 1}&filter=${currentFilter}`}
                    className={`flex items-center text-xs px-3 py-1.5 rounded-md border border-white/10 transition-colors ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-white/10 hover:border-white/20'}`}
                    scroll={false}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Link>
                  <span className="text-xs font-mono text-muted-foreground">P. {currentPage} / {totalPages}</span>
                  <Link
                    href={currentPage >= totalPages ? '#' : `?page=${currentPage + 1}&filter=${currentFilter}`}
                    className={`flex items-center text-xs px-3 py-1.5 rounded-md border border-white/10 transition-colors ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-white/10 hover:border-white/20'}`}
                    scroll={false}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
