"use client"

import { useState, useTransition, useEffect } from "react"
import { OpenTicketPlugin } from "@/lib/plugins/types"
import { Button } from "@/components/ui/button"
import { togglePluginState, updatePluginConfig, installExternalPlugin, uninstallExternalPlugin, triggerProductionBuild, triggerServerRestart } from "./actions"
import { Power, Save, Trash, ToyBrick, Settings as SettingsIcon, AlertCircle, Loader2, Download, Hammer, RefreshCw, ShieldAlert, CheckCircle2, BadgeCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import DOMPurify from "isomorphic-dompurify"

export function PluginCard({ 
  manifest, 
  isActive, 
  configJson,
  layout = "list",
  versions,
  latestVersion,
  isLocal = true,
  clickMode = "details",
  systemPlatformUrl
}: { 
  manifest: OpenTicketPlugin["manifest"], 
  isActive: boolean, 
  configJson: string | null,
  layout?: "list" | "grid",
  latestVersion?: string,
  versions?: Record<string, any>,
  isLocal?: boolean,
  clickMode?: "details" | "config",
  systemPlatformUrl?: string
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const [rawConfig, setRawConfig] = useState(configJson ? JSON.parse(configJson) : {});
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Remote plugin state
  const [selectedVersion, setSelectedVersion] = useState(latestVersion || manifest.version);
  const [installStep, setInstallStep] = useState<number>(0);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePermissions = manifest.requestedPermissions 
    || (versions && versions[selectedVersion]?.requestedPermissions) 
    || [];

  const handleToggleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isActive && activePermissions && activePermissions.length > 0) {
      setIsPermissionModalOpen(true);
    } else {
      handleToggle(e);
    }
  }

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsUpdating(true);
    try {
      await togglePluginState(manifest.id, isActive);
    } finally {
      setIsUpdating(false);
    }
  }

  const [uninstallStep, setUninstallStep] = useState<number>(0);
  const [isUninstallModalOpen, setIsUninstallModalOpen] = useState(false);

  const handleRemoteUninstall = async () => {
    setUninstallStep(1); // 1 = Drop Code
    try {
      await uninstallExternalPlugin(manifest.id);
      
      setUninstallStep(2); // 2 = Build
      await triggerProductionBuild();
      
      setUninstallStep(3); // 3 = Restart
      try {
        await triggerServerRestart();
      } catch (e) {
        // Expected behavior: server process.exit(0) forcefully closes the TCP connection, causing "Failed to fetch"
      }
      
      const poll = setInterval(async () => {
        try {
          const res = await fetch(window.location.href, { method: 'HEAD' });
          if (res.ok) {
            clearInterval(poll);
            setUninstallStep(4); // 4 = Success
            startTransition(() => {
               router.refresh();
            });
          }
        } catch(e) {}
      }, 2000);

    } catch (e: any) {
      setUninstallStep(0);
      setErrorMsg("Uninstall failed: " + e.message);
    }
  }

  const handleRemoteInstall = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!versions) return;
    setInstallStep(1); // 1 = Download
    try {
      const vInfo = versions[selectedVersion];
      await installExternalPlugin(manifest.id, selectedVersion, vInfo.sourceType, vInfo.packageName);
      
      setInstallStep(2); // 2 = Build
      try {
         await triggerProductionBuild();
      } catch (buildError: any) {
         // Auto-Rollback: Plugin code failed strict TypeScript compilation because its Types are outdated.
         await uninstallExternalPlugin(manifest.id).catch(() => {});
         
         throw new Error("Plugin version is outdated and failed system compatibility check. Installation safely rolled back.");
      }
      
      setInstallStep(3); // 3 = Restart
      try {
        await triggerServerRestart();
      } catch (e) {
        // Expected behavior: process.exit(0) kills the connection
      }
      
      const poll = setInterval(async () => {
        try {
          const res = await fetch(window.location.href, { method: 'HEAD' });
          if (res.ok) {
            clearInterval(poll);
            setInstallStep(4); // 4 = Success
            startTransition(() => {
               router.refresh();
            });
          }
        } catch(e) {}
      }, 2000);

    } catch (e: any) {
      setInstallStep(0);
      setErrorMsg("Installation aborted: " + e.message);
    }
  }

  // Ensure modal only closes after Server Component payload arrives
  useEffect(() => {
    if (!isPending) {
      if (installStep === 4) {
        setInstallStep(0);
        setIsInstallModalOpen(false);
      }
      if (uninstallStep === 4) {
        setUninstallStep(0);
        setIsUninstallModalOpen(false);
      }
    }
  }, [isPending, installStep, uninstallStep]);

  const renderInstallButton = () => {
    if (isLocal) {
      const isExternal = manifest.id !== 'slack';

      return (
        <div className={`flex gap-2 ${layout === 'grid' ? 'w-full' : ''}`}>
          <Button 
            variant={isActive ? "outline" : "default"}
            size="sm" 
            onClick={handleToggleClick} 
            disabled={isUpdating}
            className={`${isActive ? 'text-neutral-400 hover:text-white' : 'text-black font-bold shadow-[0_0_15px_rgba(0,255,200,0.3)]'} ${layout === 'grid' ? 'flex-1' : 'w-24'}`}
          >
            {isActive ? <><Power className="w-4 h-4 mr-2" /> Disable</> : <><Power className="w-4 h-4 mr-2" /> Enable</>}
          </Button>

          {isExternal && (
             <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); setIsUninstallModalOpen(true); }} 
                  disabled={uninstallStep > 0} 
                  className={`text-red-400 border-red-500/50 hover:bg-red-500/20 ${layout === 'grid' ? 'flex-1' : 'w-32'}`}
                >
                  <Trash className="w-4 h-4 mr-2" /> Uninstall
                </Button>

                <Dialog open={isUninstallModalOpen} onOpenChange={setIsUninstallModalOpen}>
                  <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-white text-xl">
                        <Trash className="w-5 h-5 text-red-500" /> Confirm Hard Uninstall
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground pt-2 text-base leading-relaxed">
                        You are about to irreversibly remove the plugin source code and recompile Next.js.
                        <br/><br/>
                        The OpenTicket frontend interface will reboot. Uninstallation requires approx 30 seconds.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {uninstallStep > 0 && (
                        <div className="space-y-4">
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${uninstallStep >= 1 ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-black text-neutral-500 border border-white/10'}`}>
                            {uninstallStep === 1 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash className="w-5 h-5" />}
                            <span className="font-medium text-sm">Dropping Filesystem Binding...</span>
                          </div>
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${uninstallStep >= 2 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-black text-neutral-500 border border-white/10'}`}>
                            {uninstallStep === 2 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hammer className="w-5 h-5" />}
                            <span className="font-medium text-sm">Orchestrating Next.js Webpack Build...</span>
                          </div>
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${uninstallStep >= 3 ? (uninstallStep === 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30') : 'bg-black text-neutral-500 border border-white/10'}`}>
                            {uninstallStep === 3 || (uninstallStep === 4 && isPending) ? <Loader2 className="w-5 h-5 animate-spin" /> : (uninstallStep >= 4 ? <CheckCircle2 className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />)}
                            <span className="font-medium text-sm">{uninstallStep >= 4 ? (isPending ? "Synchronizing UI Dashboard..." : "System Active. Finalizing...") : "Rebooting Node.js Process..."}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {uninstallStep === 0 && (
                       <DialogFooter className="border-t border-white/10 pt-4">
                          <Button variant="outline" onClick={() => setIsUninstallModalOpen(false)} className="bg-transparent text-white border-white/20">Cancel</Button>
                          <Button onClick={handleRemoteUninstall} className="bg-red-500 hover:bg-red-400 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] border-0">
                            Confirm Drop
                          </Button>
                       </DialogFooter>
                    )}
                    {uninstallStep > 0 && <p className="text-center text-xs text-neutral-500 pt-2 animate-pulse">Please do not close this window.</p>}
                  </DialogContent>
                </Dialog>
             </>
          )}
          
          <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
            <DialogContent className="sm:max-w-[425px] border border-white/10 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
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
                     {activePermissions?.map((p: any) => (
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
                   <Button onClick={(e) => { setIsPermissionModalOpen(false); handleToggle(e); }} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-0">
                      Grant & Activate
                   </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400 font-medium whitespace-pre-wrap">{errorMsg}</p>
                </div>
              )}
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
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${installStep >= 3 ? (installStep === 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30') : 'bg-black text-neutral-500 border border-white/10'}`}>
                    {installStep === 3 || (installStep === 4 && isPending) ? <Loader2 className="w-5 h-5 animate-spin" /> : (installStep >= 4 ? <CheckCircle2 className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />)}
                    <span className="font-medium text-sm">{installStep >= 4 ? (isPending ? "Synchronizing UI Dashboard..." : "System Active. Finalizing...") : "Rebooting Node.js Process..."}</span>
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

  const schema = manifest.options || (versions && latestVersion && versions[latestVersion]?.configSchema);
  const hasConfig = manifest.id.includes('slack') || manifest.id === 'github-issues' || (Array.isArray(schema) && schema.length > 0);

  const renderConfigFormsInline = () => {
    // Legacy hardcoded slack form
    if (manifest.id.includes('slack')) {
      return (
        <div className="border border-white/10 p-5 rounded-xl bg-black/40 mt-4 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center"><SettingsIcon className="w-4 h-4 mr-2"/> Slack Configuration</h4>
          <form action={async (fd) => { await updatePluginConfig(manifest.id, fd); setIsConfigOpen(false); window.location.reload(); }} className="space-y-4">
            <input type="text" name="webhookUrl" defaultValue={rawConfig?.webhookUrl || ''} className="w-full bg-black text-white p-2 border border-white/20 rounded text-sm" placeholder="Webhook URL" />
            <Button type="submit" className="w-full bg-primary text-black" onClick={(e) => e.stopPropagation()}>Save Configuration</Button>
          </form>
        </div>
      )
    } 
    // Legacy hardcoded github-issues form
    else if (manifest.id === 'github-issues') {
      return (
        <div className="border border-white/10 p-5 rounded-xl bg-black/40 mt-4 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center"><SettingsIcon className="w-4 h-4 mr-2"/> GitHub Configuration</h4>
          <form action={async (fd) => { await updatePluginConfig(manifest.id, fd); setIsConfigOpen(false); window.location.reload(); }} className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">GitHub Personal Access Token</label>
              <input type="password" name="GITHUB_TOKEN" defaultValue={rawConfig?.GITHUB_TOKEN || ''} className="w-full bg-black text-white p-2 text-sm border border-white/20 rounded" placeholder="ghp_xxxxxxxxxxxx" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Target Repositories (Comma Separated)</label>
              <input type="text" name="GITHUB_REPOS" defaultValue={rawConfig?.GITHUB_REPOS || ''} className="w-full bg-black text-white p-2 text-sm border border-white/20 rounded" placeholder="owner/repo1, owner/repo2" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Default Issue Labels</label>
              <input type="text" name="ISSUE_LABELS" defaultValue={rawConfig?.ISSUE_LABELS || 'security,incident'} className="w-full bg-black text-white p-2 text-sm border border-white/20 rounded" placeholder="security,incident" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Webhook Secret (for two-way sync)</label>
              <input type="password" name="WEBHOOK_SECRET" defaultValue={rawConfig?.WEBHOOK_SECRET || ''} className="w-full bg-black text-white p-2 text-sm border border-white/20 rounded" placeholder="Optional HMAC Secret" />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black shadow-[0_0_15px_rgba(0,255,200,0.3)] mt-2" onClick={(e) => e.stopPropagation()}>Save Configuration</Button>
          </form>
        </div>
      )
    } 
    // Dynamic Schema based Form Rendering
    else if (Array.isArray(schema) && schema.length > 0) {
      return (
        <div className="border border-white/10 p-5 rounded-xl bg-black/40 mt-4 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center"><SettingsIcon className="w-4 h-4 mr-2"/> {manifest.name} Configuration</h4>
          <form action={async (fd) => { await updatePluginConfig(manifest.id, fd); setIsConfigOpen(false); window.location.reload(); }} className="space-y-4">
            {schema.map((field: any) => (
               <div key={field.key}>
                 {field.type !== 'info' && <label className="text-xs text-neutral-400 mb-1 block">{field.label || field.key}{field.required ? ' *' : ''}</label>}
                 {field.type === 'info' ? (
                    <div className="mb-2">
                       {field.label && <h4 className="text-sm font-semibold text-white mb-2">{field.label}</h4>}
                       <div 
                         className="bg-primary/5 border border-primary/20 text-primary p-3 rounded-md text-xs leading-relaxed overflow-x-auto whitespace-normal" 
                         dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(field.content?.replace(/\{\{SYSTEM_URL\}\}/g, systemPlatformUrl || '') || '') }} 
                       />
                    </div>
                 ) : field.type === 'boolean' ? (
                    <Select name={field.key} defaultValue={rawConfig?.[field.key]?.toString() || (field.defaultValue !== undefined ? field.defaultValue.toString() : 'false')}>
                      <SelectTrigger className="w-full bg-black text-white border-white/20">
                        <SelectValue placeholder="Select boolean..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/20 text-white">
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                 ) : field.type === 'enum' ? (
                    <Select name={field.key} defaultValue={rawConfig?.[field.key] || field.defaultValue || ''}>
                      <SelectTrigger className="w-full bg-black text-white border-white/20">
                        <SelectValue placeholder="Select option..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/20 text-white">
                        {field.options?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 ) : (
                    <input 
                      type={field.type === 'secret' ? 'password' : 'text'} 
                      name={field.key} 
                      defaultValue={rawConfig?.[field.key] || field.defaultValue || ''} 
                      className="w-full bg-black text-white p-2 text-sm border border-white/20 rounded" 
                      placeholder={field.required ? 'Required field' : 'Optional field'} 
                      required={field.required}
                    />
                 )}
               </div>
            ))}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black shadow-[0_0_15px_rgba(0,255,200,0.3)] mt-2" onClick={(e) => e.stopPropagation()}>Save Configuration</Button>
          </form>
        </div>
      )
    }
    
    return null;
  }

  const renderConfigOnlyDialog = () => {
    return (
      <DialogContent className="sm:max-w-[500px] border border-white/10 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
           <DialogTitle className="flex items-center gap-3 text-white text-xl">
             <SettingsIcon className="w-5 h-5 text-primary" />
             {manifest.name} Configuration
           </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {!hasConfig ? (
             <div className="bg-black/40 border border-white/10 p-5 rounded-xl text-center mt-2 text-neutral-500 text-sm">
                <SettingsIcon className="w-5 h-5 mx-auto mb-2 opacity-30" />
                This plugin does not expose any configurable options.
             </div>
          ) : (
             renderConfigFormsInline()
          )}
          
          <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
             <Button variant="outline" onClick={(e) => { e.stopPropagation(); setIsConfigOpen(false); }} className="bg-transparent border-white/20 text-white">Close</Button>
          </div>
        </div>
      </DialogContent>
    )
  }

  const renderDetailsDialog = () => {
    return (
      <DialogContent className="sm:max-w-[700px] border border-white/10 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
           <DialogTitle className="flex flex-col gap-1 pt-2">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-2xl ${isActive ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(0,255,200,0.2)]' : 'bg-white/5 border-white/10'} border`}>
                      <ToyBrick className={`w-8 h-8 ${isActive ? 'text-primary' : 'text-neutral-500'}`} />
                   </div>
                   <div>
                      <h2 className="text-2xl text-white font-extrabold tracking-tight">{manifest.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                         <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono font-bold tracking-widest border border-white/10">v{isLocal ? manifest.version : selectedVersion}</span>
                         {isLocal ? (
                           isActive ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">ACTIVE INSTALLED</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-2 py-0.5 rounded-full font-bold border border-neutral-500/30">DISABLED</span>
                         ) : (
                           <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">REGISTRY MODULE</span>
                         )}
                      </div>
                   </div>
                </div>
             </div>
           </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
               {manifest.description}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between col-span-2">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1">Plugin Identity (UUID)</span>
                <span className="font-mono text-xs text-white break-all bg-black/60 border border-white/5 p-2 rounded truncate">{manifest.id}</span>
             </div>
             <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Author</span>
                <span className="font-mono text-sm text-white truncate mt-1 flex items-center gap-1.5">
                  {manifest.author || "Unknown Source"}
                  {manifest.author === 'OpenTicket Team' && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                </span>
             </div>
             <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Signature</span>
                <span className={`font-mono text-xs ${manifest.signature ? 'text-emerald-400' : 'text-neutral-600'} truncate mt-1`}>{manifest.signature ? 'Verified' : 'Unsigned'}</span>
             </div>
             {manifest.supportedPluginApiVersion && manifest.supportedPluginApiVersion.length > 0 && (
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between col-span-2">
                   <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Supported API Targets</span>
                   <div className="flex gap-2">
                     {manifest.supportedPluginApiVersion.map((v: string) => (
                       <span key={v} className="font-mono text-[11px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-1 rounded inline-block">{v}</span>
                     ))}
                   </div>
                </div>
             )}
             {manifest.dependsOn && manifest.dependsOn.length > 0 && (
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col justify-between col-span-2">
                   <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Hard Dependencies</span>
                   <div className="flex gap-2 flex-wrap">
                     {manifest.dependsOn.map((d: string) => (
                       <span key={d} className="font-mono text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded inline-block truncate max-w-full">{d}</span>
                     ))}
                   </div>
                </div>
             )}
          </div>

          <div className="space-y-3 bg-red-950/10 border border-red-500/10 rounded-xl p-4">
             <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" /> Requested Kernel Privileges
             </h4>
             <div className="flex flex-wrap gap-2">
               {activePermissions && activePermissions.length > 0 ? (
                 activePermissions.map((p: any) => (
                   <span key={p} className="text-[10px] bg-red-950/40 border border-red-500/30 px-2 py-1.5 rounded text-red-300 font-mono flex items-center shadow-sm">
                     {p.replace(/_/g, ' ')}
                   </span>
                 ))
               ) : (
                 <span className="text-xs text-neutral-500 italic bg-black/40 px-3 py-1.5 rounded border border-white/5">No special permissions requested. Runs in Sandbox.</span>
               )}
             </div>
          </div>

          {renderConfigFormsInline()}
          
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3 mt-8">
             <Button variant="outline" onClick={(e) => { e.stopPropagation(); setIsConfigOpen(false); }} className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">Close Details</Button>
          </div>
        </div>
      </DialogContent>
    )
  }

  const renderErrorDialog = () => (
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
  );

  if (layout === "grid") {
    // Under installed drivers or store, ALWAYS allow clicking so it doesn't feel broken
    const isClickable = true;

    return (
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <div 
          onClick={() => {
             if (isClickable) setIsConfigOpen(true);
          }}
          className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} ${isClickable ? 'cursor-pointer hover:border-primary/50 hover:bg-white/5' : ''} flex flex-col justify-between h-full transition-all gap-4 shadow-lg`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <ToyBrick className={`w-8 h-8 ${isActive ? 'text-primary animate-pulse' : 'text-neutral-500'}`} />
              <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">{isLocal ? manifest.version : selectedVersion}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight text-white">{manifest.name}</h3>
              <div className="mt-1 h-[22px] flex items-center">
                {isLocal ? (
                  isActive ? 
                    <span className="inline-block text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 leading-none">Active Installed</span>
                  : 
                    <span className="inline-block text-xs bg-neutral-500/20 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-500/30 leading-none">Installed (Disabled)</span>
                ) : (
                  <span className="inline-block text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 leading-none">Registry Module</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{manifest.description}</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end gap-2 w-full" onClick={e => e.stopPropagation()}>
            {renderInstallButton()}
          </div>
        </div>
        {clickMode === 'details' ? renderDetailsDialog() : renderConfigOnlyDialog()}
        {renderErrorDialog()}
      </Dialog>
    )
  }

  return (
    <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
      <div 
        onClick={() => setIsConfigOpen(true)}
        className={`p-5 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-black/30 border-white/10'} cursor-pointer hover:border-primary/50 flex flex-col gap-4 transition-all hover:bg-white/5 shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <ToyBrick className={`w-5 h-5 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                <h3 className="font-bold text-lg tracking-tight text-white">{manifest.name}</h3>
                <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{isLocal ? manifest.version : selectedVersion}</span>
                <div className="h-[22px] flex items-center ml-1">
                  {isLocal ? (
                    isActive ? 
                      <span className="inline-block text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 leading-none">Active Installed</span>
                    : 
                      <span className="inline-block text-xs bg-neutral-500/20 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-500/30 leading-none">Installed (Disabled)</span>
                  ) : (
                    <span className="inline-block text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 leading-none">Registry Module</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-neutral-400 mt-1">{manifest.description}</p>
            </div>
          <div className="flex items-center gap-3 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
            {renderInstallButton()}
          </div>
        </div>
      </div>
      {renderDetailsDialog()}
      {renderErrorDialog()}
    </Dialog>
  )
}
