"use client"

import { useState } from "react"
import { OpenTicketPlugin } from "@/lib/plugins/types"
import { Button } from "@/components/ui/button"
import { togglePluginState, updatePluginConfig } from "./actions"
import { Power, Save, Trash, ToyBrick } from "lucide-react"

export function PluginCard({ 
  plugin, 
  isActive, 
  configJson 
}: { 
  plugin: OpenTicketPlugin, 
  isActive: boolean, 
  configJson: string | null 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [rawConfig, setRawConfig] = useState(configJson ? JSON.parse(configJson) : {});

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await togglePluginState(plugin.manifest.id, isActive);
    } finally {
      setIsUpdating(false);
    }
  }

  // Very simplistic hardcoded config form for the Mock Pilot Slack Plugin.
  // In a production world, a plugin would expose a JSON Schema so the platform could dynamically render fields!
  return (
    <div className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} mb-4 flex flex-col gap-4 animate-fade-in-up`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <ToyBrick className={`w-5 h-5 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <h3 className="font-bold text-lg tracking-tight">{plugin.manifest.name}</h3>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{plugin.manifest.version}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{plugin.manifest.description}</p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleToggle} 
          disabled={isUpdating}
          className={`${isActive ? 'text-red-400 border-red-500/50 hover:bg-red-500/20' : 'text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20'}`}
        >
          <Power className="w-4 h-4 mr-2" />
          {isActive ? 'Uninstall / Disable' : 'Install (Enable)'}
        </Button>
      </div>

      {isActive && plugin.manifest.id === 'slack-notifier-01' && (
        <form action={async (fd) => { await updatePluginConfig(plugin.manifest.id, fd); }} className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-3">
          <label className="text-sm font-semibold text-primary">Webhook Setup</label>
          <input 
            type="text" 
            name="webhookUrl" 
            defaultValue={rawConfig?.webhookUrl || ''} 
            placeholder="https://hooks.slack.com/services/..."
            className="w-full bg-black border border-white/20 p-2 rounded text-sm focus:border-primary/50 outline-none"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-xs">
              <Save className="w-4 h-4 mr-2" /> Save Config
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
