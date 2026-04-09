import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ShieldAlert, Bug } from "lucide-react"
import { VulnFormClient } from "./vuln-form-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewVulnerabilityPage() {
  const session = await auth()
  
  if (!session?.user) return null
  const canCreate = hasPermission(session as any, 'CREATE_VULNERABILITIES')

  if (!canCreate) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 animate-fade-in-up mt-20">
        <Bug className="mx-auto w-16 h-16 text-destructive opacity-80 animate-pulse" />
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You do not possess the clearance (<code className="text-primary font-mono bg-primary/10 px-1 rounded">CREATE_VULNERABILITIES</code>) to log vulnerabilities into the registry. Please contact your administrator.
        </p>
        <Link href="/vulnerabilities">
           <Button variant="outline" className="mt-6 border-white/20 hover:bg-white/5">Return to active catalog</Button>
        </Link>
      </div>
    )
  }

  const assets = await db.asset.findMany({ select: { id: true, name: true, type: true, status: true, ipAddress: true } })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="w-8 h-8 mr-3 text-red-500" /> Log Vulnerability
          </h1>
          <p className="text-muted-foreground mt-2">Initialize CVE tracking isolating localized weaknesses before active exploitation.</p>
        </div>
      </header>
      
      <div className="glass-card rounded-xl p-8 border border-border shadow-2xl relative">
        <VulnFormClient assets={assets} />
      </div>
    </div>
  )
}
