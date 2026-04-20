import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { User, Mail, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmForm } from "@/components/ui/confirm-form"
import { toggleUserStatusAction, deleteUserAction } from "../actions"
import { ResetPasswordButton } from "./reset-password-button"
import { UserPanels } from "./user-panels"
import { hasPermission } from "@/lib/auth-utils"
import { PluginEngineContextRenderer } from "@/components/plugins/plugin-context-renderer"

export default async function UserDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'VIEW_USERS')) {
    redirect("/login")
  }

  let auditPage = parseInt(resolvedSearchParams.auditPage as string) || 1
  let filePage = parseInt(resolvedSearchParams.filePage as string) || 1
  let incPage = parseInt(resolvedSearchParams.incPage as string) || 1

  if (Number.isNaN(auditPage) || auditPage < 1) auditPage = 1;
  if (Number.isNaN(filePage) || filePage < 1) filePage = 1;
  if (Number.isNaN(incPage) || incPage < 1) incPage = 1;

  const TAKE_AUDIT = 15
  const TAKE_FILE = 8
  const TAKE_INC = 6

  // Parallel data fetching for high performance
  const canViewAuditLogs = hasPermission(session, 'VIEW_AUDIT_LOGS')
  const hasGlobalIncidents = hasPermission(session, 'VIEW_INCIDENTS_ALL')
  const canViewAssigned = hasPermission(session, 'VIEW_INCIDENTS_ASSIGNED')

  // BOLA Incident filter: Prevent cross-user assignment peeking
  let incidentsWhere: any = { assignees: { some: { id } } };
  if (!hasGlobalIncidents) {
    if (canViewAssigned && session.user.id !== id) {
       // Intersection: Only show incidents where BOTH the target user AND the viewing user are co-assigned
       incidentsWhere = { AND: [ { assignees: { some: { id } } }, { assignees: { some: { id: session.user.id } } } ] }
    } else if (!canViewAssigned && session.user.id !== id) {
       incidentsWhere = { id: "NONE" } // Structural Empty Output
    }
  }

  // BOLA Evidence filter: Hide files completely if lacking systemic viewing privileges
  const canViewAttachments = hasGlobalIncidents || session.user.id === id;

  const [user, auditLogs, totalAuditLogs, attachments, totalAttachments, assignedIncidents, totalIncidents] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { customRoles: { select: { name: true } } } }),
    canViewAuditLogs ? db.auditLog.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: TAKE_AUDIT, skip: (auditPage - 1) * TAKE_AUDIT }) : Promise.resolve([]),
    canViewAuditLogs ? db.auditLog.count({ where: { userId: id } }) : Promise.resolve(0),
    canViewAttachments ? db.attachment.findMany({ where: { uploaderId: id }, orderBy: { createdAt: 'desc' }, take: TAKE_FILE, skip: (filePage - 1) * TAKE_FILE }) : Promise.resolve([]),
    canViewAttachments ? db.attachment.count({ where: { uploaderId: id } }) : Promise.resolve(0),
    db.incident.findMany({ where: incidentsWhere, select: { id: true, title: true, status: true, severity: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: TAKE_INC, skip: (incPage - 1) * TAKE_INC }),
    db.incident.count({ where: incidentsWhere })
  ])

  if (!user) return notFound()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
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
              <span className="flex items-center gap-1 text-primary"><ShieldCheck className="w-3 h-3" /> {user.customRoles?.map(r => r.name).join(', ')}</span>
              {user.isTwoFactorEnabled && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">2FA ENFORCED</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono opacity-50 pt-2">UID: {user.id}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {session.user.id !== user.id && (
            <>
              {hasPermission(session, 'RESET_USER_PASSWORDS') && (
                 <ResetPasswordButton userId={user.id} />
              )}
              <ConfirmForm 
                action={async () => { "use server"; await toggleUserStatusAction(user.id, !user.isDisabled); }} 
                promptMessage={user.isDisabled ? "Restore this operator's platform access?" : "Suspend this operator?"}
              >
                <Button type="submit" variant={user.isDisabled ? "outline" : "destructive"} className={user.isDisabled ? "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" : "bg-red-900 border-border"}>
                  {user.isDisabled ? "Restore Access" : "Suspend Operator"}
                </Button>
              </ConfirmForm>
              <ConfirmForm action={async () => { "use server"; const fd = new FormData(); fd.append("userId", user.id); await deleteUserAction(fd); }} promptMessage="DANGER: Permanently delete identity? Data loss irreversible.">
                <Button type="submit" variant="destructive" className="bg-destructive/40 hover:bg-destructive/80">Obliterate Identity</Button>
              </ConfirmForm>
            </>
          )}
        </div>
      </div>

      <UserPanels 
         auditLogs={auditLogs}
         totalAuditLogs={totalAuditLogs}
         auditPage={auditPage}
         TAKE_AUDIT={TAKE_AUDIT}
         attachments={attachments}
         totalAttachments={totalAttachments}
         filePage={filePage}
         TAKE_FILE={TAKE_FILE}
         assignedIncidents={assignedIncidents}
         totalIncidents={totalIncidents}
         incPage={incPage}
         TAKE_INC={TAKE_INC}
         searchParamsRaw={resolvedSearchParams as Record<string, string>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-6">
            <PluginEngineContextRenderer hookType="userMainWidgets" payload={{ user }} />
         </div>
         <div className="md:col-span-1 space-y-6">
            <PluginEngineContextRenderer hookType="userSidebarWidgets" payload={{ user }} />
         </div>
      </div>
    </div>
  )
}
