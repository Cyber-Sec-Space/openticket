"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { ShieldCheck, User, Mail, Lock, CheckCircle2, AlertTriangle, Loader2, Globe, Server, Key, ArrowRight, ArrowLeft, Send, CheckCircle } from "lucide-react"
import { testSmtpConnection, dispatchSetupVerificationEmail, initializeInstance } from "./actions"
import { cn } from "@/lib/utils"

export function SetupForm({ defaultSmtp }: { defaultSmtp?: { host: string, port: string, user: string, pass: string, from: string } }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [origin, setOrigin] = useState("http://localhost:3000")
  
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpTested, setSmtpTested] = useState(false)
  
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  async function handleTestSmtp() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    
    const host = fd.get("smtpHost") as string;
    const port = parseInt(fd.get("smtpPort") as string || "0");
    const user = fd.get("smtpUser") as string;
    const pass = fd.get("smtpPassword") as string;

    if (!host || !port) {
      setError("SMTP Host and Port are required to test connection.");
      return;
    }

    setError(null);
    setSmtpTesting(true);
    setSmtpTested(false);
    
    try {
      const res = await testSmtpConnection(host, port, user, pass);
      if (res.success) {
        setSmtpTested(true);
      } else {
        setError(res.error || "SMTP connection failed");
      }
    } catch (err: any) {
      setError(err.message || "Network Error");
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    if (step === 1) {
      if (fd.get("password") !== fd.get("confirmPassword")) {
        setError("Passwords do not match.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const reqEmailVerify = fd.get("requireEmailVerification") === "on";
      const smtpEnabled = fd.get("smtpEnabled") === "on";

      if (reqEmailVerify && !smtpEnabled) {
        setError("SMTP Email Relaying MUST be enabled if Email Validation is turned on.");
        return;
      }

      if (reqEmailVerify) {
        if (!smtpTested) {
          setError("You must successfully Test the SMTP connection to guarantee the admin verification email can be dispatched.");
          return;
        }
        
        startTransition(async () => {
          const res = await dispatchSetupVerificationEmail(
            fd.get("email") as string,
            fd.get("smtpHost") as string,
            parseInt(fd.get("smtpPort") as string || "0"),
            fd.get("smtpUser") as string,
            fd.get("smtpPassword") as string,
            fd.get("smtpFrom") as string
          );
          if (!res.success) {
            setError(res.error || "Failed to dispatch verification email.");
          } else {
            setStep(4);
          }
        });
      } else {
        startTransition(async () => {
          try {
            await initializeInstance(fd);
          } catch (err: any) {
            if (typeof err?.message === 'string' && err.message.includes('NEXT_REDIRECT')) throw err;
            setError(err.message || "Initialization Error");
          }
        });
      }
    } else if (step === 4) {
      startTransition(async () => {
        try {
          await initializeInstance(fd);
        } catch (err: any) {
          if (typeof err?.message === 'string' && err.message.includes('NEXT_REDIRECT')) throw err;
          setError(err.message || "Initialization Error");
        }
      });
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      
      {/* Progress Dots */}
      <div className="flex justify-center items-center space-x-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center space-x-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors duration-500",
              step === s ? "bg-primary shadow-[0_0_10px_rgba(34,197,94,0.6)]" : step > s ? "bg-primary/50" : "bg-white/10"
            )} />
            {s !== 4 && <div className={cn("w-6 h-[1px]", step > s ? "bg-primary/30" : "bg-white/5")} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/50 rounded-lg flex items-center justify-center animate-shake">
          <AlertTriangle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* STEP 1: Admin Configuration */}
      <div className={cn("transition-all duration-300", step === 1 ? "block animate-fade-in-up" : "hidden")}>
        <div className="p-4 mb-4 text-[13px] leading-relaxed text-blue-300 bg-blue-900/20 border border-blue-500/30 rounded-lg flex items-start text-left">
          <ShieldCheck className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-blue-400" />
          <div>
            <strong className="block text-blue-400 mb-1">Step 1: Admin Credentials</strong>
            This sequence permanently designates the first Global System Administrator account. Proceed with caution.
          </div>
        </div>
        <div className="space-y-3 relative w-full">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors"><User className="w-5 h-5" /></div>
            <input type="text" name="name" required={step===1} className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" placeholder="Identity / Alias" disabled={isPending} />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors"><Mail className="w-5 h-5" /></div>
            <input type="email" name="email" required={step===1} className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" placeholder="Administrative Email" disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors"><Lock className="w-5 h-5" /></div>
              <input type="password" name="password" required={step===1} className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" placeholder="Password" disabled={isPending} />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors"><CheckCircle2 className="w-5 h-5" /></div>
              <input type="password" name="confirmPassword" required={step===1} className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" placeholder="Verify Password" disabled={isPending} />
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Platform Settings */}
      <div className={cn("transition-all duration-300", step === 2 ? "block animate-fade-in-up" : "hidden")}>
        <div className="p-4 mb-4 text-[13px] leading-relaxed text-indigo-300 bg-indigo-900/20 border border-indigo-500/30 rounded-lg flex items-start text-left">
          <Globe className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-indigo-400" />
          <div>
            <strong className="block text-indigo-400 mb-1">Step 2: Platform Base URL</strong>
            The absolute HTTP address where this node operates, critical for webhook orchestration and identity verification limits.
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              <Globe className="w-5 h-5" />
            </div>
            <input type="url" name="systemPlatformUrl" defaultValue={origin} required={step===2} className="w-full text-sm pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary/50 text-white" placeholder="https://openticket.acme.com" disabled={isPending} />
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
             <div className="flex items-start">
               <input type="checkbox" name="requireEmailVerification" id="reqEmailVerify" className="mt-1 mr-3 h-4 w-4 bg-black/50 border-white/20 rounded" disabled={isPending} />
               <div className="flex flex-col">
                 <label htmlFor="reqEmailVerify" className="text-sm font-semibold text-white">Require Email Registration Verification</label>
                 <span className="text-xs text-muted-foreground mt-1">If enabled, all new accounts (including this Admin) must physically verify email ownership before platform access is granted.</span>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* STEP 3: SMTP Settings */}
      <div className={cn("transition-all duration-300", step === 3 ? "block animate-fade-in-up" : "hidden")}>
         <div className="p-4 mb-4 text-[13px] leading-relaxed text-yellow-300 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex items-start text-left">
          <Send className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-yellow-400" />
          <div>
            <strong className="block text-yellow-400 mb-1">Step 3: Mail Relay (SMTP)</strong>
            Configure automated dispatches. If you enabled Email Verification in step 2, these settings MUST be valid right now.
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center pb-2 border-b border-white/10">
            <input type="checkbox" name="smtpEnabled" id="smtpEnabled" defaultChecked={true} className="mr-2" disabled={isPending} />
            <label htmlFor="smtpEnabled" className="text-sm text-foreground font-medium">Enable Dedicated SMTP Relaying</label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Server className="w-4 h-4" /></div>
              <input type="text" name="smtpHost" defaultValue={defaultSmtp?.host} placeholder="smtp.mailgun.org" className="w-full text-sm pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50" disabled={isPending} />
            </div>
            <div className="relative group">
              <input type="number" name="smtpPort" defaultValue={defaultSmtp?.port} placeholder="Port (e.g. 587)" className="w-full text-sm px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50" disabled={isPending} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><User className="w-4 h-4" /></div>
              <input type="text" name="smtpUser" defaultValue={defaultSmtp?.user} placeholder="SMTP Username" className="w-full text-sm pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50" disabled={isPending} />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Key className="w-4 h-4" /></div>
              <input type="password" name="smtpPassword" defaultValue={defaultSmtp?.pass} placeholder="SMTP Password" className="w-full text-sm pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50" disabled={isPending} />
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground"><Mail className="w-4 h-4" /></div>
            <input type="email" name="smtpFrom" defaultValue={defaultSmtp?.from} placeholder="From Address (e.g. support@acme.com)" className="w-full text-sm pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50" disabled={isPending} />
          </div>

          <div className="pt-2">
            <button type="button" onClick={handleTestSmtp} disabled={smtpTesting || isPending} className={cn(
                "w-full py-2 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all flex items-center justify-center",
                smtpTested ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-white/5 border-white/10 text-white hover:bg-white/10",
                smtpTesting && "opacity-70 cursor-not-allowed"
              )}>
                {smtpTesting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> EXECUTING HANDSHAKE...</> : 
                 smtpTested ? <><CheckCircle className="w-4 h-4 mr-2" /> HANDSHAKE SUCCESSFUL</> : 
                 "TEST SMTP CONNECTION"}
            </button>
          </div>
        </div>
      </div>

      {/* STEP 4: Email Verification (OTP) */}
      <div className={cn("transition-all duration-300", step === 4 ? "block animate-fade-in-up" : "hidden")}>
         <div className="p-4 mb-4 text-[13px] leading-relaxed text-green-300 bg-green-900/20 border border-green-500/30 rounded-lg flex items-start text-left flex-col items-center text-center">
          <Mail className="w-10 h-10 mb-2 text-green-400 mx-auto" />
          <strong className="block text-green-400 mb-1 w-full text-lg">Identity Verification Required</strong>
          <span className="w-full">An OTP envelope has been transported to the Admin Email. Input the unique cipher to construct the mainframe.</span>
        </div>
        
        <div className="space-y-4">
           <div className="relative group max-w-xs mx-auto">
              <input type="text" name="otpCode" required={step===4} maxLength={6} placeholder="000000" className="w-full text-center text-2xl tracking-[0.5em] px-4 py-4 bg-black/30 font-monospace border border-white/20 rounded-xl text-primary focus:ring-2 focus:ring-primary focus:outline-none uppercase" disabled={isPending} />
           </div>
        </div>

      </div>

      {/* Button Controls */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        {step > 1 && !isPending && (
          <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-3 flex justify-center items-center rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 flex-shrink-0 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        <button
          type="submit"
          disabled={isPending || smtpTesting}
          className={cn(
            "w-full py-3 px-4 flex justify-center items-center rounded-xl text-sm font-semibold text-white shadow-md transition-all duration-300",
            isPending 
              ? "bg-primary/50 cursor-not-allowed" 
              : "bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
          )}
        >
          {isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Interfacing...</>
          ) : step === 3 ? (
            <>Finalize Config <ArrowRight className="w-4 h-4 ml-2" /></>
          ) : step === 4 ? (
            <>INITIALIZE ARCHITECTURE</>
          ) : (
            <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </button>
      </div>

    </form>
  )
}
