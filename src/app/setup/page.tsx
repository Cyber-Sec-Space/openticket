import { SetupForm } from "./setup-form"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

import { AlertCircle, Database, Terminal } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  let userCount = 0;
  
  try {
    userCount = await db.user.count()
  } catch (error: any) {
    if (error?.code === 'P2021' || error?.message?.includes("does not exist")) {
      return (
        <div className="flex h-screen w-full relative overflow-hidden bg-background items-center justify-center p-4">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="w-full max-w-lg space-y-6 glass-panel p-8 rounded-2xl border border-red-500/30">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                <Database className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Database Uninitialized</h1>
              <p className="text-sm text-neutral-400">
                The OpenTicket database engine is currently empty. You must synchronize the Prisma schema with your PostgreSQL instance before initiating the system.
              </p>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg border border-white/10 space-y-2 relative group mt-4">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Execute locally via Terminal
              </span>
              <code className="text-emerald-400 font-mono text-sm block">
                npx prisma db push
              </code>
            </div>
            
            <div className="mt-8 flex justify-center">
              <a href="/setup" className="px-6 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-sm font-medium text-white transition-colors">
                Retry Connection
              </a>
            </div>
          </div>
        </div>
      )
    }
    throw error;
  }
  
  console.log("SETUP PAGE - User count is:", userCount)
  
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
        <div className="w-full max-w-lg space-y-8 glass-panel p-8 rounded-2xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
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
