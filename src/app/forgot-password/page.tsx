import { db } from "@/lib/db"
import { ScanFace } from "lucide-react"
import { ForgotPasswordForm } from "./forgot-password-form"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ForgotPasswordPage() {
  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (!settings?.smtpEnabled) {
      redirect("/login?error=SMTP Offline. Reset unavailable.")
  }

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-background">
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex w-full items-center justify-center p-4 relative z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="text-center flex flex-col items-center">
            <ScanFace className="w-12 h-12 text-blue-400 mb-4 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Identity Recovery
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Input your registered email to request a secure override link.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
