"use client"

import { useActionState } from "react"
import { sendResetLink } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(sendResetLink, undefined)

  if (state?.success) {
    return (
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg">
          <p className="font-medium">Override Link Dispatched</p>
          <p className="text-xs mt-2 text-emerald-400/80">If the identity resolves to an active operator, an instructional payload has been delivered.</p>
        </div>
        <a href="/login" className="inline-block mt-4 text-sm text-muted-foreground hover:text-white underline underline-offset-4">Return to Authentication</a>
      </div>
    )
  }

  return (
    <form action={dispatch} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-muted-foreground">Target Email</Label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          placeholder="operator@openticket.local" 
          className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
          required 
        />
      </div>

      {state?.error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 text-center">
          {state.error}
        </div>
      )}

      <Button 
        className="w-full h-12 text-md mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,100,250,0.3)] transition-all font-bold tracking-wide" 
        type="submit" 
        disabled={isPending}
      >
        {isPending ? "Generating Override..." : "Initiate Recovery Sequence"}
      </Button>

      <div className="mt-4 flex justify-center w-full pt-4">
        <a href="/login" className="text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-4">
          Abort Sequence
        </a>
      </div>
    </form>
  )
}
