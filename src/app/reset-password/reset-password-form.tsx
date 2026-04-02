"use client"

import { useActionState } from "react"
import { executeReset } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm({ token, email }: { token: string, email: string }) {
  const [state, dispatch, isPending] = useActionState(executeReset, undefined)

  if (state?.success) {
    return (
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg">
          <p className="font-medium">Credentials Successfully Re-Encoded</p>
          <p className="text-xs mt-2 text-emerald-400/80">Your new matrix key has been accepted.</p>
        </div>
        <a href="/login" className="inline-block mt-4 text-sm text-primary hover:text-white underline underline-offset-4 font-bold">Authenticate & Login</a>
      </div>
    )
  }

  return (
    <form action={dispatch} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <div className="space-y-2">
        <Label htmlFor="password" className="text-muted-foreground">New Private Key (Password)</Label>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          placeholder="••••••••••" 
          className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
          required 
          minLength={8}
        />
        <p className="text-[10px] text-muted-foreground pt-1">Must contain at least 8 characters.</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-muted-foreground">Re-transmit Key</Label>
        <Input 
          id="confirmPassword" 
          name="confirmPassword" 
          type="password" 
          placeholder="••••••••••" 
          className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
          required 
          minLength={8}
        />
      </div>

      {state?.error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 text-center">
          {state.error}
        </div>
      )}

      <Button 
        className="w-full h-12 text-md mt-4 bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(250,50,50,0.3)] transition-all font-bold tracking-wide" 
        type="submit" 
        disabled={isPending}
      >
        {isPending ? "Hashing Array..." : "Finalize Override"}
      </Button>
    </form>
  )
}
