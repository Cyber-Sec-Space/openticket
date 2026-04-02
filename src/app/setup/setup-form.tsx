"use client"

import { useState } from "react"
import { useTransition } from "react"
import { ShieldCheck, User, Mail, Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { initializeInstance } from "./actions"
import { cn } from "@/lib/utils"

export function SetupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    const pw = formData.get("password") as string
    const cpw = formData.get("confirmPassword") as string
    if (pw !== cpw) {
      setError("Passwords do not match.")
      return
    }
    
    startTransition(async () => {
      try {
        await initializeInstance(formData)
        // Redirection is handled silently inside the server action
      } catch (err: any) {
        setError(err.message || "An initialization error occurred.")
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 mb-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/50 rounded-lg flex items-center justify-center animate-shake">
          <AlertTriangle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* Admin Warning Notice */}
      <div className="p-4 mb-4 text-[13px] leading-relaxed text-blue-300 bg-blue-900/20 border border-blue-500/30 rounded-lg flex items-start text-left">
        <ShieldCheck className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-blue-400" />
        <div>
          <strong className="block text-blue-400 mb-1">Architecture Bare-Metal Init</strong>
          This sequence permanently designates the first Global System Administrator account. Proceed with caution.
        </div>
      </div>

      <div className="space-y-4 relative w-full">
        {/* Name Field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <User className="w-5 h-5" />
          </div>
          <input
            type="text"
            name="name"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-white/50 transition-all hover:bg-white/10 ui-element-focus"
            placeholder="Identity / Alias"
            autoComplete="name"
            disabled={isPending}
          />
        </div>

        {/* Email Field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Mail className="w-5 h-5" />
          </div>
          <input
            type="email"
            name="email"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-white/50 transition-all hover:bg-white/10 ui-element-focus"
            placeholder="Administrative Email"
            autoComplete="email"
            disabled={isPending}
          />
        </div>

        {/* Password Field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type="password"
            name="password"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-white/50 transition-all hover:bg-white/10 ui-element-focus"
            placeholder="Security Clearance Key (Password)"
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <input
            type="password"
            name="confirmPassword"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-white/50 transition-all hover:bg-white/10 ui-element-focus"
            placeholder="Verify Security Key"
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

      </div>

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "w-full py-3 px-4 flex justify-center items-center rounded-xl text-sm font-semibold text-white shadow-md transition-all duration-300 relative overflow-hidden group",
          isPending 
            ? "bg-primary/50 cursor-not-allowed" 
            : "bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Initializing Architecture...
          </>
        ) : (
          "Initialize Mainframe (ADMIN)"
        )}
      </button>

    </form>
  )
}
