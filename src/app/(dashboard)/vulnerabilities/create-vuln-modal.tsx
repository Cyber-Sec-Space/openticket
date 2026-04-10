"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { VulnFormClient } from "./new/vuln-form-client"

export function CreateVulnModal({ assets }: { assets: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
          <Plus className="w-4 h-4 mr-2" /> Broadcast Vulnerability
        </Button>
      } />
      <DialogContent className="w-full max-w-3xl bg-background/95 border border-border shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] glass-card">
        <DialogTitle className="text-3xl font-extrabold tracking-tight mb-4 text-white">
          Vulnerability Disclosure
        </DialogTitle>
        <p className="text-muted-foreground text-sm mb-6">Proactively register a newly discovered structural vulnerability to the intelligence stream.</p>
        
        <VulnFormClient assets={assets} />
      </DialogContent>
    </Dialog>
  )
}
