"use client"

import { useState } from "react"
import { ShieldCheck, ShieldAlert, KeyRound, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import QRCode from "qrcode"
import { generate2FA, verifyAndEnable2FA, disable2FA } from "./actions"

export function TwoFactorPanel({ isEnabled }: { isEnabled: boolean }) {
  const [setupStep, setSetupStep] = useState<"IDLE" | "SCANNING">("IDLE")
  const [qrSrc, setQrSrc] = useState<string>("")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [code, setCode] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleInitiateSetup = async () => {
    setIsPending(true)
    setErrorMsg("")
    try {
      const res = await generate2FA()
      if (res.error) throw new Error(res.error)
      if (res.otpauthUrl) {
         const qrDataUrl = await QRCode.toDataURL(res.otpauthUrl, {
           color: { dark: "#000000", light: "#ffffff" },
           width: 200,
           margin: 2
         })
         setQrSrc(qrDataUrl)
         setSetupStep("SCANNING")
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setIsPending(false)
    }
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setIsPending(true)
    setErrorMsg("")
    try {
      const res = await verifyAndEnable2FA(code)
      if (res.error) throw new Error(res.error)
      // Success will boundary reload automatically via revalidatePath
      setSetupStep("IDLE")
      setCode("")
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setIsPending(false)
    }
  }

  const handleDisable = async () => {
    if (!confirm("WARNING: Disabling Two-Factor Authentication severely drops your endpoint perimeter defense score. Confirm disconnect?")) return;
    setIsPending(true)
    setErrorMsg("")
    try {
       const res = await disable2FA()
       if (res.error) throw new Error(res.error)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
       <div className="flex justify-between items-start">
         <div className="space-y-1">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-widest flex items-center">
              <KeyRound className="w-4 h-4 mr-2" /> Two-Factor Interlock
            </h3>
            <p className="text-xs text-muted-foreground w-3/4">Require a dynamic synchronization token (TOTP) from an external hardware scanner or authenticator application alongside your password.</p>
         </div>
         
         <div className="flex flex-col items-end gap-2">
            {isEnabled ? (
               <div className="flex items-center space-x-3">
                  <div className="flex items-center text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                     <ShieldCheck className="w-4 h-4 mr-2" /> Active
                  </div>
                  <Button disabled={isPending} onClick={handleDisable} variant="destructive" size="sm" className="h-8 uppercase text-[10px] tracking-widest">
                     Disable
                  </Button>
               </div>
            ) : (
               <div className="flex items-center space-x-3">
                  <div className="flex items-center text-muted-foreground border border-white/10 bg-black/50 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
                     <ShieldAlert className="w-4 h-4 mr-2 opacity-50" /> Vulnerable
                  </div>
                  {setupStep === "IDLE" && (
                     <Button disabled={isPending} onClick={handleInitiateSetup} size="sm" className="h-8 uppercase text-[10px] tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:text-white">
                        Enable 2FA
                     </Button>
                  )}
               </div>
            )}
         </div>
       </div>

       {setupStep === "SCANNING" && (
          <div className="mt-6 p-6 rounded-xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row gap-6 animate-in fade-in zoom-in-95">
             <div className="bg-black/50 p-4 rounded-lg border border-white/10 shrink-0 mx-auto">
               <div className="rounded-md overflow-hidden ring-2 ring-primary/50 ring-offset-2 ring-offset-black">
                 {qrSrc ? <img src={qrSrc} alt="2FA QR Code" className="w-[200px] h-[200px]" /> : <div className="w-[200px] h-[200px] animate-pulse bg-white/10" />}
               </div>
             </div>
             <div className="flex-1 space-y-4 flex flex-col justify-center">
                <div className="space-y-1">
                  <h4 className="font-bold text-primary flex items-center">
                    <QrCode className="w-4 h-4 mr-2" /> Synchronize Device
                  </h4>
                  <p className="text-xs text-muted-foreground">Scan this visual matrix using Google Authenticator, Authy, or your secure enclave token ring.</p>
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label className="uppercase text-[10px] tracking-widest text-primary/70">Verify Synchronization Ping</Label>
                  <div className="flex gap-2">
                     <Input 
                       disabled={isPending}
                       value={code}
                       onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6))}
                       placeholder="000000"
                       className="font-mono tracking-widest text-center text-lg w-32 bg-black/40 border-primary/40 focus-visible:ring-primary"
                     />
                     <Button 
                       disabled={code.length !== 6 || isPending}
                       onClick={handleVerify}
                       className="bg-primary text-black font-bold flex-1 tracking-widest shadow-[0_0_15px_rgba(0,255,200,0.3)]"
                     >
                        VERIFY
                     </Button>
                  </div>
                  {errorMsg && <p className="text-xs text-destructive font-mono mt-2">{errorMsg}</p>}
                </div>
                
                <div className="pt-2">
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setSetupStep("IDLE")} className="text-xs text-muted-foreground hover:text-white">
                    Abort Protocol
                  </Button>
                </div>
             </div>
          </div>
       )}
       {errorMsg && setupStep === "IDLE" && (
         <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded text-center">{errorMsg}</p>
       )}
    </div>
  )
}
