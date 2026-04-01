"use client"

import { useState } from "react"
import { Clock, Download, FileJson, ChevronLeft, ChevronRight, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface UserPanelsProps {
  auditLogs: any[]
  totalAuditLogs: number
  auditPage: number
  TAKE_AUDIT: number
  attachments: any[]
  totalAttachments: number
  filePage: number
  TAKE_FILE: number
  assignedIncidents: any[]
  totalIncidents: number
  incPage: number
  TAKE_INC: number
  searchParamsRaw: Record<string, any>
}

export function UserPanels({
  auditLogs, totalAuditLogs, auditPage, TAKE_AUDIT,
  attachments, totalAttachments, filePage, TAKE_FILE,
  assignedIncidents, totalIncidents, incPage, TAKE_INC,
  searchParamsRaw
}: UserPanelsProps) {

  // URL Helper
  const mapParams = (updates: Record<string, string>) => {
    const sp = new URLSearchParams()
    if (searchParamsRaw.auditPage) sp.set('auditPage', String(searchParamsRaw.auditPage))
    if (searchParamsRaw.filePage) sp.set('filePage', String(searchParamsRaw.filePage))
    if (searchParamsRaw.incPage) sp.set('incPage', String(searchParamsRaw.incPage))
    Object.entries(updates).forEach(([k, v]) => sp.set(k, v))
    return `?${sp.toString()}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
      
      {/* Audit Log Panel */}
      <Dialog>
        <DialogTrigger render={<div />}>
          <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all group shadow-xl">
            <div className="w-16 h-16 rounded-xl bg-black/40 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-emerald-400">Operator Telemetry</h3>
              <p className="text-xs text-muted-foreground font-mono">View {totalAuditLogs.toLocaleString()} Immutable Records</p>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl w-full bg-black/95 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Clock className="w-5 h-5" /> Detailed Telemetry Matrix
              <Badge variant="outline" className="font-mono text-[10px] bg-black/40 text-emerald-400 border-emerald-500/30 ml-auto">Total: {totalAuditLogs.toLocaleString()}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[60vh] mt-4">
            {auditLogs.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-8">No immutable telemetry recorded.</p> : auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="font-mono text-emerald-400">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed break-words font-mono opacity-80">{typeof log.changes === 'object' ? JSON.stringify(log.changes) : String(log.changes)}</p>
              </div>
            ))}
          </div>
          {totalAuditLogs > TAKE_AUDIT && (
             <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                {auditPage <= 1 ? (
                   <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
                ) : (
                   <Link href={mapParams({ auditPage: String(auditPage - 1) })} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
                   </Link>
                )}
                <span className="text-xs font-mono text-muted-foreground">Page {auditPage} of {Math.ceil(totalAuditLogs / TAKE_AUDIT)}</span>
                {auditPage >= Math.ceil(totalAuditLogs / TAKE_AUDIT) ? (
                   <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                ) : (
                   <Link href={mapParams({ auditPage: String(auditPage + 1) })} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                   </Link>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Evidence Format */}
      <Dialog>
        <DialogTrigger render={<div />}>
          <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-blue-950/20 transition-all group shadow-xl">
            <div className="w-16 h-16 rounded-xl bg-black/40 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <FileJson className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-blue-400">Evidence Payloads</h3>
              <p className="text-xs text-muted-foreground font-mono">View {totalAttachments.toLocaleString()} Uploaded Matrices</p>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl w-full bg-black/95 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.1)] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <FileJson className="w-5 h-5" /> Aggregated Evidence Payload
              <Badge variant="outline" className="font-mono text-[10px] bg-black/40 text-blue-400 border-blue-500/30 ml-auto">Total: {totalAttachments.toLocaleString()}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[60vh] mt-4">
            {attachments.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-8">No digital evidence uploaded.</p> : attachments.map(att => (
              <div key={att.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-blue-400/30 transition-colors">
                <div className="max-w-[70%]">
                  <p className="text-sm font-mono text-foreground truncate">{att.filename}</p>
                  <p className="text-xs text-muted-foreground">{new Date(att.createdAt).toLocaleDateString()}</p>
                </div>
                <a href={att.fileUrl} download>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-400/20">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
          {totalAttachments > TAKE_FILE && (
             <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                {filePage <= 1 ? (
                   <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
                ) : (
                   <Link href={mapParams({ filePage: String(filePage - 1) })} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
                   </Link>
                )}
                <span className="text-xs font-mono text-muted-foreground">Page {filePage} of {Math.ceil(totalAttachments / TAKE_FILE)}</span>
                {filePage >= Math.ceil(totalAttachments / TAKE_FILE) ? (
                   <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                ) : (
                   <Link href={mapParams({ filePage: String(filePage + 1) })} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                   </Link>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Assigned Incidents Format */}
      <Dialog>
        <DialogTrigger render={<div />}>
          <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-orange-500/50 hover:bg-orange-950/20 transition-all group shadow-xl">
            <div className="w-16 h-16 rounded-xl bg-black/40 border-2 border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-orange-400">Escalation Tracks</h3>
              <p className="text-xs text-muted-foreground font-mono">View {totalIncidents.toLocaleString()} Assigned Incidents</p>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-5xl w-full bg-black/95 border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Activity className="w-5 h-5" /> Bound Incidents Matrix
              <Badge variant="outline" className="font-mono text-[10px] bg-black/40 text-orange-400 border-orange-500/30 ml-auto">Total: {totalIncidents.toLocaleString()}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar max-h-[60vh] overflow-y-auto mt-4 p-1">
            {assignedIncidents.length === 0 ? <p className="text-sm text-muted-foreground italic col-span-full text-center py-8">No active escalations mapped to this operator.</p> : assignedIncidents.map(inc => (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="block">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-orange-500/50 transition-colors cursor-pointer group space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-muted-foreground">ID-{inc.id.substring(0,6).toUpperCase()}</span>
                    <Badge className="bg-orange-900/50 text-orange-400 border border-orange-500/30 text-[10px] py-0">{inc.status}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold truncate group-hover:text-orange-400 transition-colors">{inc.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span className="px-2 py-1 rounded bg-black/40 inline-block">{inc.severity}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {totalIncidents > TAKE_INC && (
             <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                {incPage <= 1 ? (
                   <Button variant="outline" size="sm" disabled className="h-8 text-xs disabled:opacity-30"><ChevronLeft className="w-4 h-4 mr-1" /> Previous Block</Button>
                ) : (
                   <Link href={mapParams({ incPage: String(incPage - 1) })} scroll={false}>
                      <Button variant="outline" size="sm" className="h-8 text-xs"><ChevronLeft className="w-4 h-4 mr-1" /> Previous Block</Button>
                   </Link>
                )}
                <span className="text-xs font-mono text-muted-foreground">Page {incPage} of {Math.ceil(totalIncidents / TAKE_INC)}</span>
                {incPage >= Math.ceil(totalIncidents / TAKE_INC) ? (
                   <Button variant="outline" size="sm" disabled className="h-8 text-xs disabled:opacity-30">Next Block <ChevronRight className="w-4 h-4 ml-1" /></Button>
                ) : (
                   <Link href={mapParams({ incPage: String(incPage + 1) })} scroll={false}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">Next Block <ChevronRight className="w-4 h-4 ml-1" /></Button>
                   </Link>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
