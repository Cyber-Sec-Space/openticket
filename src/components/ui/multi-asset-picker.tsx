"use client"
import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Check, Server, ChevronDown } from "lucide-react"

interface AssetOption {
  id: string;
  name: string;
  type: string;
  status: string;
  ipAddress: string | null;
}

interface MultiAssetPickerProps {
  assets: AssetOption[];
  defaultSelectedIds?: string[];
  disabled?: boolean;
}

export function MultiAssetPicker({ assets, defaultSelectedIds = [], disabled = false }: MultiAssetPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelectedIds))
  const [open, setOpen] = useState(false)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="relative">
      {/* Hidden inputs to dynamically bind form POST payload as an array */}
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name="assetIds" value={id} />
      ))}
      {selected.size === 0 && <input type="hidden" name="assetIds" value="NONE" />}

      <button 
        type="button" 
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex min-h-[42px] w-full items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all flex-wrap gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selected.size === 0 ? (
           <span className="text-muted-foreground italic flex items-center gap-2"><Server className="w-4 h-4"/> No Infrastructure Mapped (Select Assets)</span>
        ) : (
           <div className="flex flex-wrap gap-1.5">
             {Array.from(selected).map(id => {
               const a = assets.find(x => x.id === id)
               return a ? (
                 <Badge key={id} variant="secondary" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.1)]">
                   {a.name}
                 </Badge>
               ) : null
             })}
           </div>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 w-full z-50 rounded-lg border border-border/80 bg-black/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
             {assets.map(a => (
               <label 
                 key={a.id} 
                 onClick={(e) => { e.preventDefault(); toggle(a.id); }}
                 className="flex flex-col px-3 py-2.5 rounded-md hover:bg-red-500/10 cursor-pointer transition-colors group border border-transparent hover:border-red-500/20"
               >
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.has(a.id) ? 'bg-red-500 border-red-500 text-white' : 'border-white/30 group-hover:border-red-500/50'}`}>
                       {selected.has(a.id) && <Check className="w-3 h-3 stroke-[3]" />}
                     </div>
                     <span className="text-sm font-medium text-white/90 font-mono tracking-tight">{a.name}</span>
                   </div>
                   <Badge variant="outline" className={`text-[10px] uppercase opacity-80 ${a.status === 'ACTIVE' ? 'border-green-500/30 text-green-400 bg-green-950/20' : 'border-white/10 text-muted-foreground'}`}>
                     {a.status}
                   </Badge>
                 </div>
                 <div className="pl-7 mt-1 text-[10px] uppercase tracking-wider flex gap-2 overflow-hidden text-muted-foreground/60 font-mono whitespace-nowrap">
                   <span>{a.type}</span>
                   {a.ipAddress && <span>• {a.ipAddress}</span>}
                 </div>
               </label>
             ))}
               
             {assets.length === 0 && (
               <div className="p-4 text-center text-sm text-muted-foreground">No active assets registered.</div>
             )}
          </div>
        </div>
      )}
      
      {/* Invisible backdrop to dismiss dropdown */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>}
    </div>
  )
}
