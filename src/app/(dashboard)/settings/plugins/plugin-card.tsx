"use client"

import { useState } from "react"
import { OpenTicketPlugin } from "@/lib/plugins/types"
import { Button } from "@/components/ui/button"
import { togglePluginState, updatePluginConfig } from "./actions"
import { Power, Save, Trash, ToyBrick, Settings as SettingsIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function PluginCard({ 
  manifest, 
  isActive, 
  configJson 
}: { 
  manifest: OpenTicketPlugin["manifest"], 
  isActive: boolean, 
  configJson: string | null 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [rawConfig, setRawConfig] = useState(configJson ? JSON.parse(configJson) : {});
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await togglePluginState(manifest.id, isActive);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} flex flex-col gap-4 transition-all hover:bg-white/5`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <ToyBrick className={`w-5 h-5 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <h3 className="font-bold text-lg tracking-tight text-white">{manifest.name}</h3>
            <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{manifest.version}</span>
            {isActive && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Active</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{manifest.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isActive && manifest.id === 'slack-notifier-01' && (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-black/50 border-white/20 text-blue-400 hover:text-blue-300 hover:bg-white/10 hover:border-blue-500/50 transition-all shadow-[0_0_10px_rgba(0,100,255,0.1)]">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <ToyBrick className="w-5 h-5 text-primary" /> {manifest.name} Config
                  </DialogTitle>
                  <DialogDescription>
                    Configure the environmental variables and access controls specifically requested by this component.
                  </DialogDescription>
                </DialogHeader>
                
                <form action={async (fd) => { await updatePluginConfig(manifest.id, fd); setIsConfigOpen(false); }} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">Slack Webhook URL</label>
                    <input 
                      type="text" 
                      name="webhookUrl" 
                      defaultValue={rawConfig?.webhookUrl || ''} 
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full bg-black border border-white/20 p-2.5 rounded-md text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                      required
                    />
                    <p className="text-xs text-muted-foreground">The secure webhook gateway to your SOC channel.</p>
                  </div>
                  <DialogFooter className="pt-4 border-t border-white/10">
                    <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)} className="bg-transparent text-white border-white/20 hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-black font-bold">
                      <Save className="w-4 h-4 mr-2" /> Save Config
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggle} 
            disabled={isUpdating}
            className={`${isActive ? 'text-red-400 border-red-500/50 hover:bg-red-500/20' : 'bg-primary text-black hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(0,255,200,0.3)]'}`}
          >
            {isActive ? (
              <>
                <Trash className="w-4 h-4 mr-2" /> Uninstall
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2" /> Install
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
