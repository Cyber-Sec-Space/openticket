"use client"

import { useActionState } from "react"
import { attemptRegistration } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RegisterForm({ inviteToken, forcedEmail }: { inviteToken?: string; forcedEmail?: string }) {
  const [errorMessage, dispatch, isPending] = useActionState(attemptRegistration, undefined)

  return (
    <form action={dispatch} className="space-y-6 mt-8 relative">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-muted-foreground">Operator Moniker (Name)</Label>
          <Input 
            id="name" 
            name="name" 
            type="text" 
            placeholder="John Doe" 
            className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">Operational Email</Label>
          {forcedEmail && <input type="hidden" name="email" value={forcedEmail} />}
          <Input 
            id="email" 
            name={forcedEmail ? undefined : "email"}
            type="email" 
            placeholder="operator@openticket.local" 
            className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
            required 
            defaultValue={forcedEmail}
            disabled={!!forcedEmail}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">Secure Passphrase (min. 8 characters)</Label>
          <Input 
            id="password" 
            name="password" 
            type="password"
            className="bg-black/20 border-white/10 text-white focus-visible:ring-primary backdrop-blur-md"
            required 
            minLength={8}
          />
        </div>
      </div>
      
      {errorMessage && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 animate-in fade-in zoom-in-95 leading-relaxed">
          {errorMessage === "REGISTRATION_DISABLED" ? "Administrative Decree: Public registration is structurally suspended at this time." : 
           errorMessage === "REGISTRATION_FAILED" ? "Secure handshake failed: Payload rejected or identity map collision occurred." :
           errorMessage === "MISSING_FIELDS" ? "Incomplete credentials payload." :
           errorMessage === "PASSWORD_TOO_SHORT" ? "Inadequate passphrase length (Under 8 characters)." : errorMessage}
        </div>
      )}

      <Button 
        className="w-full h-12 text-md mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,255,200,0.3)] transition-all font-bold tracking-wide" 
        type="submit" 
        disabled={isPending}
      >
        {isPending ? "Generating Identity..." : "Commit Registration"}
      </Button>

      <div className="mt-6 flex justify-center w-full border-t border-white/5 pt-4">
         <a href="/login" className="text-xs font-mono tracking-widest text-primary/60 hover:text-primary transition-colors underline underline-offset-4 border-primary/20 hover:border-primary">
           [ RETURN TO IDENTITY SELECTION ]
         </a>
      </div>
    </form>
  )
}
