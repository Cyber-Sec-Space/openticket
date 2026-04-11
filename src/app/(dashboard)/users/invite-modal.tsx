"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Link as LinkIcon, Loader2, Check, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createInvitation } from "./actions"

export function InviteModal() {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [email, setEmail] = useState("")
  const [resultUrl, setResultUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError("")
    setResultUrl("")
    
    try {
      const formData = new FormData()
      if (email.trim()) formData.append("email", email.trim())
      
      const result = await createInvitation(formData)
      if (result.success && result.joinUrl) {
        setResultUrl(result.joinUrl)
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate invitation.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = () => {
    if (!resultUrl) return
    navigator.clipboard.writeText(resultUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setEmail("")
    setResultUrl("")
    setError("")
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <Send className="w-3.5 h-3.5 mr-2" /> Invite Operator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black/95 border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-wide text-blue-400">Provision Authorization Link</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Generate a secure enrollment token. This will bypass global registration lockdowns.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!resultUrl ? (
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="inviteEmail" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex justify-between">
                  <span>Constrain to Email</span>
                  <span className="text-blue-400/60 lowercase italic text-[10px]">optional</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-70" />
                  <Input 
                    id="inviteEmail" 
                    type="email" 
                    placeholder="operator@acme.corp" 
                    className="pl-10 bg-black/50 border-white/10 font-mono text-sm focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  If provided, the token will be strictly locked to this address, and an automated email will be dispatched. If left blank, a public one-time join link will be generated.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white">Cancel</Button>
                <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white min-w-[140px]">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (email ? "Dispatch & Generate" : "Generate Public Link")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-emerald-400">Token Provisioned</h3>
                <p className="text-xs text-emerald-400/70">
                  {email ? `An invitation was explicitly bound to ${email} and dispatched.` : "A public one-time link has been generated."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Join URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={resultUrl} className="bg-black/50 border-white/10 font-mono text-xs text-blue-300 h-9" />
                  <Button variant="outline" size="icon" onClick={handleCopy} className="h-9 w-9 shrink-0 border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                    {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <Button variant="ghost" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
