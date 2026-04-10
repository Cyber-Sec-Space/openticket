"use client"

import { useState } from "react"
import { OpenTicketPlugin } from "@/lib/plugins/types"
import { Button } from "@/components/ui/button"
import { togglePluginState, updatePluginConfig, installExternalPlugin, triggerProductionBuild, triggerServerRestart } from "./actions"
import { Power, Save, Trash, ToyBrick, Settings as SettingsIcon, AlertCircle, Loader2, Download, Hammer, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react"
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
  configJson,
  layout = "list",
  versions,
  latestVersion,
  isLocal = true
}: { 
  manifest: OpenTicketPlugin["manifest"], 
  isActive: boolean, 
  configJson: string | null,
  layout?: "list" | "grid",
  versions?: Record<string, { sourceType: string, packageName?: string }>,
  latestVersion?: string,
  isLocal?: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [rawConfig, setRawConfig] = useState(configJson ? JSON.parse(configJson) : {});
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Remote plugin state
  const [selectedVersion, setSelectedVersion] = useState(latestVersion || manifest.version);
  const [installStep, setInstallStep] = useState<number>(0);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const handleToggleClick = () => {
    if (!isActive && manifest.requestedPermissions && manifest.requestedPermissions.length > 0) {
      setIsPermissionModalOpen(true);
    } else {
      handleToggle();
    }
  }

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await togglePluginState(manifest.id, isActive);
    } finally {
      setIsUpdating(false);
    }
  }

  const handleRemoteInstall = async () => {
    if (!versions) return;
    setInstallStep(1); // 1 = Download
    try {
      const vInfo = versions[selectedVersion];
      await installExternalPlugin(manifest.id, selectedVersion, vInfo.sourceType, vInfo.packageName);
      
      setInstallStep(2); // 2 = Build
      // We don't await this directly if it blocks, but let's do it sequentially
      await triggerProductionBuild();
      
      setInstallStep(3); // 3 = Restart
      await triggerServerRestart();
      
      // Start polling for server revival
      const poll = setInterval(async () => {
        try {
          const res = await fetch('/api/health', { method: 'HEAD' }).catch(() => fetch(window.location.href, { method: 'HEAD' }));
          if (res.ok) {
            clearInterval(poll);
            window.location.reload();
          }
        } catch(e) {}
      }, 2000);

    } catch (e: any) {
      setInstallStep(0);
      alert("Installation failed: " + e.message);
    }
  }

  const renderInstallButton = () => {
    if (isLocal) {
      return (
        <>
          <Button 
            variant={isActive ? "outline" : "default"}
            size="sm" 
            onClick={handleToggleClick} 
            disabled={isUpdating}
            className={`${isActive ? 'text-red-400 border-red-500/50 hover:bg-red-500/20' : 'text-black font-bold shadow-[0_0_15px_rgba(0,255,200,0.3)]'} ${layout === 'grid' ? 'w-full' : 'w-32'}`}
          >
            {isActive ? <><Trash className="w-4 h-4 mr-2" /> Uninstall</> : <><Power className="w-4 h-4 mr-2" /> Install</>}
          </Button>
          
          <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
            <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950">
               <DialogHeader>
                   <DialogTitle className="text-white text-xl flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-indigo-400" />
                      Authorize Plugin
                   </DialogTitle>
               </DialogHeader>
               <div className="py-4 space-y-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                     <strong className="text-white">{manifest.name}</strong> is requesting the following core operational privileges to act on behalf of the OpenTicket automated bot instance:
                  </p>
                  <div className="bg-black/50 border border-white/5 rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                     {manifest.requestedPermissions?.map(p => (
                        <div key={p} className="flex items-center gap-2 text-sm text-red-300 font-mono tracking-tighter">
                           <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                           {p.replace(/_/g, ' ')}
                        </div>
                     ))}
                  </div>
                  <p className="text-xs text-neutral-500">By granting these permissions, this plugin will be capable of performing these actions autonomously in the background.</p>
               </div>
               <DialogFooter>
                   <Button variant="outline" onClick={() => setIsPermissionModalOpen(false)} className="bg-transparent border-white/20 text-white">Cancel</Button>
                   <Button onClick={() => { setIsPermissionModalOpen(false); handleToggle(); }} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-0">
                      Grant & Activate
                   </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    } else {
      return (
        <Dialog open={isInstallModalOpen} onOpenChange={setIsInstallModalOpen}>
          <DialogTrigger className={`inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 text-black font-bold bg-primary shadow-[0_0_15px_rgba(0,255,200,0.3)] hover:bg-primary/90 flex-shrink-0 ${layout === 'grid' ? 'w-full' : 'w-32'}`}>
              <Download className="w-4 h-4 mr-2" /> Download
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white text-xl">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Important Install Warning
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2 text-base leading-relaxed">
                Installing deep core plugins via the registry requires OpenTicket to <strong>recompile its static assets and execute a server restart</strong> via your Docker/Host supervisor. 
                <br/><br/>
                Database operations via API will remain largely insulated, but the visual Dashboard may experience approx 30-40 seconds of downtime.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {installStep === 0 ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-400">Target Version</label>
                  <select 
                    value={selectedVersion} 
                    onChange={e => setSelectedVersion(e.target.value)}
                    className="w-full bg-black border border-white/20 p-2.5 rounded-md text-sm text-white focus:border-primary outline-none"
                  >
                    {versions && Object.keys(versions).map(v => (
                       <option key={v} value={v}>{v} {v === latestVersion ? '(Latest)' : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${installStep >= 1 ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-black text-neutral-500 border border-white/10'}`}>
                    {installStep === 1 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    <span className="font-medium text-sm">Downloading & Injecting Code...</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${installStep >= 2 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-black text-neutral-500 border border-white/10'}`}>
                    {installStep === 2 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hammer className="w-5 h-5" />}
                    <span className="font-medium text-sm">Orchestrating Next.js Webpack Build...</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${installStep >= 3 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-black text-neutral-500 border border-white/10'}`}>
                    {installStep === 3 ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    <span className="font-medium text-sm">Rebooting Node.js Process...</span>
                  </div>
                </div>
              )}
            </div>
            {installStep === 0 && (
               <DialogFooter className="border-t border-white/10 pt-4">
                  <Button variant="outline" onClick={() => setIsInstallModalOpen(false)} className="bg-transparent text-white border-white/20">Cancel</Button>
                  <Button onClick={handleRemoteInstall} className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    Confirm & Build
                  </Button>
               </DialogFooter>
            )}
            {installStep > 0 && <p className="text-center text-xs text-neutral-500 pt-2 animate-pulse">Please do not close this window.</p>}
          </DialogContent>
        </Dialog>
      );
    }
  }

  if (layout === "grid") {
    return (
      <div className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} flex flex-col justify-between h-full transition-all hover:bg-white/5 gap-4`}>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <ToyBrick className={`w-8 h-8 ${isActive ? 'text-primary animate-pulse' : 'text-neutral-500'}`} />
            <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">{isLocal ? manifest.version : selectedVersion}</span>
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight text-white">{manifest.name}</h3>
            {isActive && <span className="inline-block mt-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Active Installed</span>}
            {!isLocal && <span className="inline-block mt-1 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">Registry Module</span>}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{manifest.description}</p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end gap-2">
          {renderInstallButton()}
        </div>
      </div>
    )
  }

  // List layout omitted for brevity but included to satisfy component signature
  return (
    <div className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} flex flex-col gap-4 transition-all hover:bg-white/5`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <ToyBrick className={`w-5 h-5 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <h3 className="font-bold text-lg tracking-tight text-white">{manifest.name}</h3>
            <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{isLocal ? manifest.version : selectedVersion}</span>
            {isActive && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Active</span>}
            {!isLocal && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">Remote</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{manifest.description}</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {isActive && manifest.id.includes('slack') && (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
               <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border h-8 rounded-md px-3 bg-black/50 border-white/20 text-blue-400 hover:text-blue-300 hover:bg-white/10"><SettingsIcon className="w-4 h-4 mr-2" /> Configure</DialogTrigger>
               <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950">
                <DialogHeader><DialogTitle className="text-white flex items-center"><ToyBrick className="w-4 h-4 mr-2"/> Default Config</DialogTitle></DialogHeader>
                <form action={async (fd) => { await updatePluginConfig(manifest.id, fd); setIsConfigOpen(false); }} className="space-y-4 py-4">
                  <input type="text" name="webhookUrl" defaultValue={rawConfig?.webhookUrl || ''} className="w-full bg-black text-white p-2 border border-white/20 rounded" placeholder="Webhook URL" />
                  <Button type="submit">Save</Button>
                </form>
               </DialogContent>
            </Dialog>
           )}
          {renderInstallButton()}
        </div>
      </div>
    </div>
  )
}
