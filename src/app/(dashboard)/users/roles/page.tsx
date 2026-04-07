import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Shield, ShieldAlert, Key, Trash2, Edit3, Settings } from "lucide-react"
import { RoleManager } from "./RoleManager"

export const metadata = {
  title: "Roles & Permissions | OpenTicket",
}

export default async function RolesPage() {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'VIEW_ROLES')) {
    redirect("/login")
  }

  // Fetch all custom roles with user count
  const roles = await db.customRole.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' }
    ]
  })

  // Full permission enum strings for checkboxes
  // Full 48-point permission matrix for checkboxes
  const availablePermissions = [
    // Incidents
    "VIEW_INCIDENTS_ALL",
    "VIEW_INCIDENTS_ASSIGNED",
    "VIEW_INCIDENTS_UNASSIGNED",
    "CREATE_INCIDENTS",
    "UPDATE_INCIDENTS_METADATA",
    "UPDATE_INCIDENT_STATUS_RESOLVE",
    "UPDATE_INCIDENT_STATUS_CLOSE",
    "ASSIGN_INCIDENTS_SELF",
    "ASSIGN_INCIDENTS_OTHERS",
    "DELETE_INCIDENTS",
    "VIEW_INCIDENT_COMMENTS",
    "CREATE_INCIDENT_COMMENTS",
    "DELETE_INCIDENT_COMMENTS",
    "UPLOAD_INCIDENT_ATTACHMENTS",
    "DELETE_INCIDENT_ATTACHMENTS",
    "LINK_INCIDENT_TO_ASSET",

    // Collaboration
    "VIEW_TEAMS",
    "MANAGE_TEAMS",

    // Assets
    "VIEW_ASSETS",
    "CREATE_ASSETS",
    "UPDATE_ASSETS",
    "DELETE_ASSETS",

    // Vulnerabilities
    "VIEW_VULNERABILITIES",
    "CREATE_VULNERABILITIES",
    "UPDATE_VULNERABILITIES",
    "DELETE_VULNERABILITIES",
    "LINK_VULN_TO_ASSET",

    // Users
    "VIEW_USERS",
    "CREATE_USERS",
    "UPDATE_USER_PROFILE",
    "ASSIGN_USER_ROLES",
    "RESET_USER_PASSWORDS",
    "SUSPEND_USERS",
    "DELETE_USERS",

    // Roles
    "VIEW_ROLES",
    "CREATE_ROLES",
    "UPDATE_ROLES",
    "DELETE_ROLES",

    // System
    "VIEW_DASHBOARD",
    "VIEW_SYSTEM_SETTINGS",
    "UPDATE_SYSTEM_SETTINGS",
    "MANAGE_INTEGRATIONS",
    "VIEW_PLUGINS",
    "INSTALL_PLUGINS",
    "TOGGLE_PLUGINS",
    "CONFIGURE_PLUGINS",
    "RESTART_SYSTEM_SERVICES",
    "VIEW_AUDIT_LOGS",
    "EXPORT_DATA",

    // Auth & Bots
    "ISSUE_API_TOKENS",
    "REVOKE_API_TOKENS"
  ]

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pt-20 md:pt-8 bg-background text-foreground antialiased selection:bg-primary/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border/40 pb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent blur-3xl -z-10 rounded-full" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Key className="w-8 h-8 mr-3 text-primary drop-shadow-[0_0_10px_rgba(0,186,161,0.5)]" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-2xl text-sm leading-relaxed">
            Configure access tiers and distribute specialized privileges across the system. 
            Protect core infrastructure by adhering to the principle of least privilege.
          </p>
        </div>
      </div>

      <RoleManager 
         roles={roles} 
         availablePermissions={availablePermissions} 
      />
    </div>
  )
}
