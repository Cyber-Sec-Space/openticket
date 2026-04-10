"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createApiTokenAction, deleteApiTokenAction } from "./actions"
import { Trash2, Copy, Check, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function TokensClient({ tokens }: { tokens: any[] }) {
  const [name, setName] = useState("")
  const [newToken, setNewToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.append("name", name)
    try {
      const res = await createApiTokenAction(fd)
      setNewToken(res.rawToken)
      setName("")
    } catch (e: any) {
      setErrorMsg(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
       <Dialog open={!!errorMsg} onOpenChange={(open) => !open && setErrorMsg(null)}>
         <DialogContent className="sm:max-w-[425px] border border-red-500/30 bg-zinc-950 shadow-[0_0_50px_rgba(255,0,0,0.15)]" onClick={(e) => e.stopPropagation()}>
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-white text-xl">
               <AlertCircle className="w-5 h-5 text-red-500" /> Action Failed
             </DialogTitle>
           </DialogHeader>
           <div className="py-2">
             <p className="text-red-400 text-sm bg-red-500/10 p-4 rounded-lg border border-red-500/20 leading-relaxed font-mono">
                {errorMsg}
             </p>
           </div>
           <DialogFooter className="mt-2 border-t border-white/10 pt-4">
              <Button variant="outline" onClick={() => setErrorMsg(null)} className="w-full bg-transparent border-white/20 text-white hover:bg-white/5 font-bold">Dismiss</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {newToken && (
         <div className="bg-emerald-950/40 border border-emerald-500 p-6 rounded-lg animate-fade-in-up">
           <h3 className="text-emerald-400 font-bold mb-2">Token Generated Successfully!</h3>
           <p className="text-sm text-foreground/80 mb-4">Please copy this token now. You will not be able to see it again.</p>
           <div className="flex gap-2 items-center">
             <code className="bg-black/50 p-3 rounded flex-1 font-mono text-emerald-300 break-all">{newToken}</code>
             <Button 
               variant="outline" 
               className="h-full border-emerald-500/30 hover:bg-emerald-500/10" 
               onClick={() => { navigator.clipboard.writeText(newToken); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
               type="button"
             >
               {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
             </Button>
           </div>
           <Button type="button" variant="outline" className="mt-4 text-xs font-mono border-white/20" onClick={() => setNewToken(null)}>Close</Button>
         </div>
       )}

       {!newToken && (
         <form onSubmit={handleCreate} className="flex gap-4">
           <Input placeholder="Token Name (e.g. CI/CD Pipeline)" value={name} onChange={e => setName(e.target.value)} required className="bg-black/30 w-64 border-white/10 focus:ring-purple-500/50" />
           <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]">Generate New Token</Button>
         </form>
       )}

       <div className="grid gap-3 pt-6 border-t border-white/10">
         {tokens.map(t => (
           <div key={t.id} className="flex justify-between items-center p-4 bg-black/20 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
             <div>
               <div className="font-semibold text-primary tracking-wide">{t.name}</div>
               <div className="text-[10px] text-muted-foreground font-mono mt-1">Created: {t.createdAt.toLocaleDateString()}</div>
             </div>
             <form action={async () => { await deleteApiTokenAction(t.id) }}>
               <Button type="submit" variant="destructive" size="sm" className="bg-destructive/20 text-destructive hover:bg-destructive/40 border-0 h-8">
                 <Trash2 className="w-4 h-4" />
               </Button>
             </form>
           </div>
         ))}
         {tokens.length === 0 && <div className="text-sm text-muted-foreground italic">No automation tokens active.</div>}
       </div>
    </div>
  )
}
