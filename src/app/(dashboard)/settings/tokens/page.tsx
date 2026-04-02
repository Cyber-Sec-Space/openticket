import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { KeyRound, ShieldAlert } from "lucide-react"
import { TokensClient } from "./tokens-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ApiTokensPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  
  if (!session.user.roles.includes('API_ACCESS') && !session.user.roles.includes('ADMIN')) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="glass-card rounded-xl border border-destructive/50 p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mb-2" />
          <h2 className="text-xl font-bold text-destructive">API Access Required</h2>
          <p className="text-muted-foreground w-3/4">Your identity does not possess the API_ACCESS or ADMIN clearance tier required for machine-to-machine automation. Please contact an Administrator to escalate your privileges.</p>
          <Link href="/settings">
             <Button variant="outline" className="mt-4 border-white/10 text-muted-foreground hover:text-white">Return to Settings</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tokens = await db.apiToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <KeyRound className="w-8 h-8 mr-3 text-purple-400" /> Automation Tokens
          </h1>
          <p className="text-muted-foreground mt-2">Manage machine-to-machine Identity keys for external systems.</p>
        </div>
        <Link href="/settings">
           <Button variant="outline" className="border-white/10 bg-black/20 text-muted-foreground hover:text-white">← Back to Preferences</Button>
        </Link>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl p-6">
        <div className="mb-6 flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-200/80">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-purple-400" />
          <p>Tokens generated here provide direct access to the OpenTicket REST API. These tokens adopt your exact permission set (e.g. if you are SECOPS, the token has SECOPS privileges). Keep them strictly confidential.</p>
        </div>

        <TokensClient tokens={tokens} />
      </div>
    </div>
  )
}
