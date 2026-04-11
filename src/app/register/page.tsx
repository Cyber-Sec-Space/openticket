import { RegisterForm } from "./register-form"
import { db } from "@/lib/db"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export default async function RegisterPage({ searchParams }: { searchParams: { invite?: string } }) {
  const inviteToken = searchParams.invite
  let invitationRecord: any = null

  if (inviteToken) {
    invitationRecord = await db.invitation.findUnique({ where: { token: inviteToken } })
    if (invitationRecord && invitationRecord.expiresAt < new Date()) {
      invitationRecord = null // expired
    }
  }

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  const allowRegistration = settings?.allowRegistration ?? true

  if (!allowRegistration && !invitationRecord) {
    return (
      <div className="flex h-screen w-full relative overflow-hidden bg-background">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex w-full items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md space-y-6 glass-panel p-8 rounded-2xl border border-destructive/50 shadow-2xl text-center">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-destructive">Enrollment Suspended</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              By administrative decree, public operator registration is currently deactivated on this node.
            </p>
            <div className="pt-6">
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors uppercase tracking-widest text-xs font-bold border border-primary/20 p-3 rounded-md block bg-primary/5">
                [ Return to Portal ]
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-background">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="flex w-full items-center justify-center p-4 relative z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="text-center flex flex-col items-center">
            <img src="/logo.png" alt="OpenTicket Logo" className="mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)] w-16 h-16" />
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              OpenTicket
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invitationRecord ? "Accepting Personal Invitation" : "New Operator Initialization"}
            </p>
          </div>
          <RegisterForm inviteToken={invitationRecord?.token} forcedEmail={invitationRecord?.email} />
        </div>
      </div>
    </div>
  )
}
