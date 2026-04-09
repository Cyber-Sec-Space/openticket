"use client"
import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Check, Users, ChevronDown } from "lucide-react"

interface UserOption {
  id: string;
  name: string | null;
  customRoles?: any[];
}

interface MultiAssigneePickerProps {
  users: UserOption[];
  defaultSelectedIds?: string[];
}

export function MultiAssigneePicker({ users, defaultSelectedIds = [] }: MultiAssigneePickerProps) {
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
      {/* Hidden inputs to bind to standard Server Actions formData parser */}
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name="assigneeIds" value={id} />
      ))}
      {selected.size === 0 && <input type="hidden" name="assigneeIds" value="UNASSIGNED" />}

      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="flex min-h-[42px] w-full items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all flex-wrap gap-2"
      >
        {selected.size === 0 ? (
           <span className="text-muted-foreground italic flex items-center gap-2"><Users className="w-4 h-4"/> Unassigned (Click to add)</span>
        ) : (
           <div className="flex flex-wrap gap-1.5">
             {Array.from(selected).map(id => {
               const u = users.find(x => x.id === id)
               return u ? (
                 <Badge key={id} variant="secondary" className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,100,255,0.1)]">
                   {u.name}
                 </Badge>
               ) : null
             })}
           </div>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-full z-50 rounded-lg border border-border/80 bg-black/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
             {users.map(u => (
               <label 
                 key={u.id} 
                 onClick={(e) => { e.preventDefault(); toggle(u.id); }}
                 className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors group border border-transparent hover:border-primary/20"
               >
                 <div className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.has(u.id) ? 'bg-primary border-primary text-black' : 'border-white/30 group-hover:border-primary/50'}`}>
                     {selected.has(u.id) && <Check className="w-3 h-3 stroke-[3]" />}
                   </div>
                   <span className="text-sm font-medium text-white/90">{u.name}</span>
                 </div>
                 <Badge variant="outline" className="text-[10px] uppercase opacity-60 border-white/10 bg-black/40">{u.customRoles?.map((r:any) => r.name).join(', ') || 'OPERATOR'}</Badge>
               </label>
             ))}
               
             {users.length === 0 && (
               <div className="p-4 text-center text-sm text-muted-foreground">No personnel available.</div>
             )}
          </div>
        </div>
      )}
      
      {/* Invisible backdrop to close the popup */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>}
    </div>
  )
}
