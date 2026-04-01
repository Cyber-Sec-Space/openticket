import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { User, Mail, ShieldCheck, Clock, Download, FileJson } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ConfirmForm } from "@/components/ui/confirm-form"
import { toggleUserStatusAction, deleteUserAction } from "../actions"

export default async function UserDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const user = await db.user.findUnique({
    where: { id },
    include: {
      reportedIncidents: { select: { id: true, title: true, status: true, severity: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      assignedIncidents: { select: { id: true, title: true, status: true, severity: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      attachments: { orderBy: { createdAt: 'desc' }, take: 10 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
    }
  })

  if (!user) return notFound()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center bg-black/40 p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${user.isDisabled ? 'border-red-500/50 bg-red-950/20 text-red-500' : 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'}`}>
            <User className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              {user.name || "Default Originator"}
              {user.isDisabled ? (
                <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-950/50 text-xs">SUSPENDED</Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-950/50 text-xs">ACTIVE</Badge>
              )}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
              <span className="flex items-center gap-1 text-primary"><ShieldCheck className="w-3 h-3" /> {user.role}</span>
              {user.isTwoFactorEnabled && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">2FA ENFORCED</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono opacity-50 pt-2">UID: {user.id}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {session.user.id !== user.id && (
            <>
              <ConfirmForm 
                action={async () => { "use server"; await toggleUserStatusAction(user.id, !user.isDisabled); }} 
                promptMessage={user.isDisabled ? "Restore this operator's platform access?" : "Suspend this operator?"}
              >
                <Button type="submit" variant={user.isDisabled ? "outline" : "destructive"} className={user.isDisabled ? "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" : "bg-red-900 border-border"}>
                  {user.isDisabled ? "Restore Platform Access" : "Suspend Operator"}
                </Button>
              </ConfirmForm>
              <ConfirmForm action={async () => { "use server"; const fd = new FormData(); fd.append("userId", user.id); await deleteUserAction(fd); }} promptMessage="DANGER: Permanently delete identity? Data loss irreversible.">
                <Button type="submit" variant="destructive" className="bg-destructive/40 hover:bg-destructive/80">Obliterate Identity</Button>
              </ConfirmForm>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Audit Trail */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-lg font-bold text-emerald-400 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4" /> Operator Action Audit Logging
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {user.auditLogs.length === 0 ? <p className="text-xs text-muted-foreground italic">No immutable telemetry recorded.</p> : user.auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-black/30 rounded-lg border border-white/5 text-sm space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="font-mono text-emerald-400">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">{log.createdAt.toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed break-words">{String(log.changes)}</p>
                <span className="text-[10px] font-mono opacity-50 block">Targeting [{log.entityType}] ID:{log.entityId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Binary Uploads */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-lg font-bold text-blue-400 tracking-tight flex items-center gap-2">
            <FileJson className="w-4 h-4" /> Evidence Payload Matrix
          </h2>
          <div className="space-y-2">
            {user.attachments.length === 0 ? <p className="text-xs text-muted-foreground italic">No digital evidence uploaded by this operator.</p> : user.attachments.map(att => (
              <div key={att.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5 group hover:border-blue-400/30 transition-colors">
                <div className="max-w-[70%]">
                  <p className="text-xs font-mono text-foreground truncate">{att.filename}</p>
                  <p className="text-[10px] text-muted-foreground">{att.createdAt.toLocaleDateString()}</p>
                </div>
                <a href={att.fileUrl} download>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-400/20">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Tracks */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6 mt-6">
        <h2 className="text-lg font-bold tracking-tight">Assigned Operational Incidents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.assignedIncidents.length === 0 ? <p className="text-xs text-muted-foreground italic col-span-full">No active escalations mapped to this operator.</p> : user.assignedIncidents.map(inc => (
            <Link key={inc.id} href={`/incidents/${inc.id}`} className="block">
              <div className="p-4 bg-black/40 border border-white/5 rounded-xl hover:border-primary/50 transition-colors cursor-pointer group space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-muted-foreground">ID-{inc.id.substring(0,6).toUpperCase()}</span>
                  <Badge className="bg-emerald-900 border border-emerald-500/30 text-[10px] py-0">{inc.status}</Badge>
                </div>
                <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{inc.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="px-2 py-1 rounded bg-white/5 inline-block">{inc.severity}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
