"use client"

import { useActionState, useState, useEffect } from "react"
import { authenticate } from "./actions"
import { signOut } from "next-auth/react"
import { ScanFace } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ allowRegistration = false, allowPasswordReset = false }: { allowRegistration?: boolean, allowPasswordReset?: boolean }) {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [persistedEmail, setPersistedEmail] = useState("")
  const [persistedPass, setPersistedPass] = useState("")
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const registeredStatus = searchParams.get("registered")
  const errorStatus = searchParams.get("error")

  useEffect(() => {
    if (errorMessage === "REQUIRES_2FA" || errorMessage === "INVALID_2FA") {
       setShowTwoFactor(true)
    }
  }, [errorMessage])

  useEffect(() => {
    if (typeof window !== 'undefined' && searchParams.has("clearsession")) {
       // Await the destruction of the NextAuth session cookie before mutating the URL,
       // otherwise the Edge proxy will detect a valid session on the clean /login path
       // and aggressively bounce the client back to the suspended dashboard (forming an infinite loop).
       signOut({ redirect: false }).then(() => {
           router.replace("/login");
       }).catch(console.error);
    }
  }, [searchParams, router])

  const onSubmitCapture = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault()
     
     const formData = new FormData(e.currentTarget)
     
     if (!showTwoFactor) {
         setPersistedEmail(formData.get("email") as string)
         setPersistedPass(formData.get("password") as string)
     } else {
         // Prevent Credential DOM Bleeding: Re-append memory state directly into the submission payload
         formData.set("email", persistedEmail)
         formData.set("password", persistedPass)
     }
     
     // React 19 Action Dispatch
     import("react").then(r => r.startTransition(() => {
        dispatch(formData)
     }))
  }

  return (
    <form action={dispatch} onSubmit={onSubmitCapture} className="space-y-6 mt-8 relative">
      {!showTwoFactor ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@openticket.local" 
              className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground flex justify-between">
              <span>Password</span>
              {allowPasswordReset && (
                <a href="/forgot-password" className="text-xs text-primary/80 hover:text-primary transition-colors underline-offset-4 hover:underline">
                  Forgot Password?
                </a>
              )}
            </Label>
            <Input 
              id="password" 
              name="password" 
              type="password"
              className="bg-black/20 border-white/10 text-white focus-visible:ring-primary backdrop-blur-md"
              required 
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
           {/* Security: Credentials strictly retained in React JS Memory layer, eliminating DOM-based credential exposure. */}
           
           <div className="space-y-3 bg-primary/5 p-6 rounded-xl border border-primary/20 flex flex-col items-center">
              <ScanFace className="w-12 h-12 text-primary mb-2 shadow-[0_0_20px_rgba(0,255,150,0.5)] border rounded-full p-2 border-primary/30" />
              <Label htmlFor="totpCode" className="text-primary font-bold tracking-widest uppercase">
                Two-Factor Interlock
              </Label>
              <p className="text-xs text-muted-foreground text-center px-4">
                Protective protocol active. Input your 6-digit Authenticator payload.
              </p>
              <Input 
                id="totpCode" 
                name="totpCode" 
                type="text"
                autoComplete="off"
                maxLength={6}
                placeholder="000000"
                className="bg-black/40 border-primary/40 text-primary text-center tracking-[1rem] font-mono text-xl focus-visible:ring-primary h-14 mt-4 shadow-[0_0_15px_rgba(0,255,200,0.1)]"
                required 
                autoFocus
              />
            </div>
        </div>
      )}
      
      {registeredStatus === "verify" && (
        <div className="text-sm font-medium text-emerald-400 bg-emerald-400/10 p-3 rounded-md border border-emerald-400/20 animate-in fade-in zoom-in-95 leading-relaxed text-center">
          Identity created successfully. Please check your email inbox to verify your account before logging in.
        </div>
      )}
      
      {registeredStatus === "verified" && (
        <div className="text-sm font-medium text-emerald-400 bg-emerald-400/10 p-3 rounded-md border border-emerald-400/20 animate-in fade-in zoom-in-95 leading-relaxed text-center">
          Identity verified successfully. You may now log into the portal.
        </div>
      )}
      
      {registeredStatus === "true" && (
        <div className="text-sm font-medium text-emerald-400 bg-emerald-400/10 p-3 rounded-md border border-emerald-400/20 animate-in fade-in zoom-in-95 leading-relaxed text-center">
          Identity created successfully. You may now log in.
        </div>
      )}

      {errorStatus && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 animate-in fade-in zoom-in-95 leading-relaxed text-center">
          {errorStatus === "InvalidVerificationLink" ? "Verification failed: Malformed token payload." :
           errorStatus === "InvalidVerificationToken" ? "Verification failed: Token mismatches." :
           errorStatus === "TokenExpired" ? "Verification failed: The crypto token has expired." : errorStatus}
        </div>
      )}

      {errorMessage && errorMessage !== "REQUIRES_2FA" && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 animate-in fade-in zoom-in-95 leading-relaxed text-center">
          {errorMessage === "INVALID_2FA" ? "Invalid Two-Factor Code provided." : 
           errorMessage === "GLOBAL_LOCKED" ? "Administrator Enforcement: This endpoint is structurally clamped pending TOTP interlock. Contact SecOps." : 
           errorMessage === "RATE_LIMIT_EXCEEDED" ? "Access Denied: Too many failed network authentication drops. Firewall lockout enabled." :
           errorMessage === "EMAIL_NOT_VERIFIED" ? "Access Denied: Identity verification pending. Check your email for the activation link." :
           errorMessage === "IDENTITY_SUSPENDED" ? "Account Suspended: Your digital identity has been administratively disabled from the OpenTicket perimeter." :
           errorMessage}
        </div>
      )}

      <Button 
        className="w-full h-12 text-md mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,255,200,0.3)] transition-all font-bold tracking-wide" 
        type="submit" 
        disabled={isPending}
      >
        {isPending ? "Authenticating..." : (showTwoFactor ? "Verify Code" : "Access Portal")}
      </Button>
      
      {showTwoFactor && (
        <div className="mt-4 flex justify-center w-full">
           <button type="button" onClick={() => setShowTwoFactor(false)} className="text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-4">
             Abort & Return to Identity Selection
           </button>
        </div>
      )}

      {!showTwoFactor && allowRegistration && (
        <div className="mt-6 flex justify-center w-full border-t border-white/5 pt-4">
           <a href="/register" className="text-xs font-mono tracking-widest text-primary/60 hover:text-primary transition-colors underline underline-offset-4 border-primary/20 hover:border-primary">
             [ INITIATE ENROLLMENT ]
           </a>
        </div>
      )}
    </form>
  )
}
