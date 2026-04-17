"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, ShieldCheck } from "lucide-react"

type SlaConfig = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export const INCIDENT_TEMPLATES: Record<string, SlaConfig> = {
  "NIST_IR": { critical: 4, high: 24, medium: 72, low: 168, info: 720 },
  "ISO_27001": { critical: 2, high: 12, medium: 48, low: 120, info: 720 },
  "GDPR_STRICT": { critical: 1, high: 24, medium: 48, low: 72, info: 336 },
  "RELAXED_INTERNAL": { critical: 8, high: 48, medium: 168, low: 336, info: 1440 }
}

export const VULN_TEMPLATES: Record<string, SlaConfig> = {
  "CISA_BOD_22_01": { critical: 336, high: 720, medium: 1440, low: 2880, info: 8760 }, // 14 days, 30 days, 60 days
  "PCI_DSS_V4": { critical: 720, high: 720, medium: 2160, low: 2160, info: 8760 }, // 30 days for High/Crit
  "FEDRAMP_MODERATE": { critical: 720, high: 720, medium: 2160, low: 4320, info: 8760 }, // 30d, 30d, 90d, 180d
  "STANDARD_ENTERPRISE": { critical: 336, high: 720, medium: 2160, low: 4320, info: 8760 } // 14d, 30d, 90d, 180d
}

export function SlaSettingsPanel({ defaultSla, title = "Service Level Agreements (SLA)", description = "Configure the automated countdown timers based on severity classifications.", namePrefix = "sla", templates = INCIDENT_TEMPLATES }: { defaultSla: SlaConfig, title?: string, description?: string, namePrefix?: string, templates?: Record<string, SlaConfig> }) {
  const [sla, setSla] = useState<SlaConfig>(defaultSla)

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-wide text-white mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col space-y-3">
        <Label className="text-sm font-semibold tracking-wide text-primary/80">Compliance Configuration Templates</Label>
        <p className="text-[11px] text-muted-foreground pb-2 w-3/4">
          Instantly apply globally recognized incident response maximum tolerable operational downtime SLAs.
        </p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(templates).map(([name, config]) => (
            <Button 
              key={name}
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setSla(config)}
              className="bg-black/30 border-blue-500/30 hover:bg-blue-500/20 text-blue-400 font-mono text-[10px]"
            >
              {name.replace(/_/g, ' ')}
            </Button>
          ))}
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={() => setSla(defaultSla)}
            className="text-muted-foreground hover:text-white font-mono text-[10px]"
          >
            RESET TO SAVED
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
        <div className="space-y-2 p-4 bg-black/20 rounded-md border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-20"><Clock className="w-10 h-10 text-destructive" /></div>
          <Label className="text-xs uppercase tracking-widest text-destructive font-bold z-10 relative">Critical</Label>
          <div className="relative z-10">
            <Input 
              name={`${namePrefix}CriticalHours`} 
              type="number" 
              min="1" 
              value={sla?.critical ?? ''}
              onChange={(e) => setSla({...sla, critical: parseInt(e.target.value) || 1})}
              className="mt-1 font-mono text-lg bg-black/50 border-destructive/30 focus:border-destructive text-white h-12 w-full pr-12" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">HRS</span>
          </div>
        </div>
        
        <div className="space-y-2 p-4 bg-black/20 rounded-md border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-20"><Clock className="w-10 h-10 text-orange-500" /></div>
          <Label className="text-xs uppercase tracking-widest text-orange-500 font-bold z-10 relative">High</Label>
          <div className="relative z-10">
            <Input 
              name={`${namePrefix}HighHours`} 
              type="number" 
              min="1" 
              value={sla?.high ?? ''}
              onChange={(e) => setSla({...sla, high: parseInt(e.target.value) || 1})}
              className="mt-1 font-mono text-lg bg-black/50 border-orange-500/30 focus:border-orange-500 text-white h-12 w-full pr-12" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">HRS</span>
          </div>
        </div>

        <div className="space-y-2 p-4 bg-black/20 rounded-md border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-20"><Clock className="w-10 h-10 text-yellow-500" /></div>
          <Label className="text-xs uppercase tracking-widest text-yellow-500 font-bold z-10 relative">Medium</Label>
          <div className="relative z-10">
            <Input 
              name={`${namePrefix}MediumHours`} 
              type="number" 
              min="1" 
              value={sla?.medium ?? ''}
              onChange={(e) => setSla({...sla, medium: parseInt(e.target.value) || 1})}
              className="mt-1 font-mono text-lg bg-black/50 border-yellow-500/30 focus:border-yellow-500 text-white h-12 w-full pr-12" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">HRS</span>
          </div>
        </div>

        <div className="space-y-2 p-4 bg-black/20 rounded-md border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 opacity-20"><Clock className="w-10 h-10 text-emerald-500" /></div>
          <Label className="text-xs uppercase tracking-widest text-emerald-500 font-bold z-10 relative">Low</Label>
          <div className="relative z-10">
            <Input 
              name={`${namePrefix}LowHours`} 
              type="number" 
              min="1" 
              value={sla?.low ?? ''}
              onChange={(e) => setSla({...sla, low: parseInt(e.target.value) || 1})}
              className="mt-1 font-mono text-lg bg-black/50 border-emerald-500/30 focus:border-emerald-500 text-white h-12 w-full pr-12" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">HRS</span>
          </div>
        </div>

        {/* Hidden field for INFO tier as it's not prominently displayed */}
        <input type="hidden" name={`${namePrefix}InfoHours`} value={sla?.info ?? ''} />

      </div>
    </div>
  )
}
