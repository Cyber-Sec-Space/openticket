import { SetupForm } from "./setup-form"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  const userCount = await db.user.count()
  
  if (userCount > 0) {
    redirect("/login")
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
            <p className="mt-2 text-sm text-yellow-500/80 uppercase font-bold tracking-widest">
              Setup Wizard
            </p>
          </div>
          <SetupForm />
        </div>
      </div>
    </div>
  )
}
