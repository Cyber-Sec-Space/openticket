import { db } from "@/lib/db"
import { ShieldAlert } from "lucide-react"
import { ResetPasswordForm } from "./reset-password-form"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const p = await searchParams
  const token = p.token as string
  const email = p.email as string

  if (!token || !email) {
    redirect("/forgot-password?error=Invalid parameters")
  }

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (settings?.allowPasswordReset === false) {
      redirect("/login?error=Password reset has been disabled by the administrator.")
  }

  // Pre-validate token
  const resetData = await db.passwordResetToken.findUnique({
    where: { email_token: { email, token } }
  })

  let validityState: "VALID" | "INVALID" | "EXPIRED" = "VALID"
  if (!resetData) {
    validityState = "INVALID"
  } else if (new Date() > resetData.expires) {
    validityState = "EXPIRED"
  }

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-background">
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex w-full items-center justify-center p-4 relative z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          
          <div className="text-center flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-red-400 mb-4 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Identity Override Mode
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
               Establishing new authorization credentials for <span className="font-mono text-xs block mt-1 text-primary">{email}</span>
            </p>
          </div>

          {validityState !== "VALID" ? (
             <div className="text-center space-y-4">
               <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm">
                  {validityState === "EXPIRED" 
                    ? "Security Window Expired. This override link surpassed the 15-minute validity limit." 
                    : "Invalid Protocol. Token integrity constraint failed."}
               </div>
               <a href="/forgot-password" className="inline-block mt-4 text-sm text-muted-foreground hover:text-white underline underline-offset-4">Request a new sequence</a>
             </div>
          ) : (
            <ResetPasswordForm token={token} email={email} />
          )}

        </div>
      </div>
    </div>
  )
}
