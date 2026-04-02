"use client"

import { useState } from "react"
import { Bell, RadioReceiver } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateNotificationPreferences } from "./actions"
import { useActionState } from "react"

export function NotificationPanel({ user }: { user: any }) {
  const [state, dispatch, isPending] = useActionState(updateNotificationPreferences, undefined)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  
  const [enabled, setEnabled] = useState(user.browserNotificationsEnabled)

  const handleToggleSystem = async () => {
    if (typeof window === 'undefined') return;

    if (!enabled) {
      if (!('Notification' in window)) {
        setPermissionError("This browser lacks HTML5 Notification APIs.")
        return;
      }

      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setPermissionError("Operating System or Browser restricted the permission. Manually enable in Chrome/Edge bounds.")
        return;
      }
      
      setEnabled(true)
      setPermissionError(null)
      // We rely on the form submission below to sync with the Database.
    } else {
      setEnabled(false)
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-8 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold tracking-wide flex-1">Browser Notifications</h3>
        {state?.success && <span className="text-xs text-primary font-bold animate-pulse">SYNCED</span>}
      </div>

      <div className="p-5 bg-black/30 border border-white/5 rounded-xl space-y-6">
        
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-sm">HTML5 Desktop Streaming</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Allows the telemetry agent to bypass the browser frame and present OS-level alerts over windows.</p>
          </div>
          <Button 
            type="button"
            variant="outline"
            className={`font-bold transition-all w-[140px] text-xs ${enabled ? 'bg-primary/20 text-primary border-primary/50' : 'bg-destructive/20 text-destructive border-destructive/50'}`}
            onClick={handleToggleSystem}
          >
             {enabled ? 'SYSTEM ARMED' : 'SYSTEM OFFLINE'}
          </Button>
        </div>

        {permissionError && (
           <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{permissionError}</p>
        )}

        {enabled && (
          <form action={dispatch} className="pt-4 border-t border-white/5 space-y-6 animate-fade-in-up">
             {/* Hidden state to keep track of the armed status */}
             <input type="hidden" name="browserNotificationsEnabled" value={enabled ? "true" : "false"} />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnCritical" defaultChecked={user.notifyOnCritical} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">CRITICAL Incidents</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnHigh" defaultChecked={user.notifyOnHigh} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">HIGH Incidents</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnAssign" defaultChecked={user.notifyOnAssign} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">New Assignments (Self)</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnResolution" defaultChecked={user.notifyOnResolution} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Incident Resolutions (Self)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnAssetCompromise" defaultChecked={user.notifyOnAssetCompromise} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Asset Compromises</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors">
                  <input type="checkbox" name="notifyOnUnassigned" defaultChecked={user.notifyOnUnassigned} className="w-4 h-4 bg-black border-white/20 text-primary focus:ring-primary rounded" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">New Unassigned Incidents</span>
                </label>
             </div>

             <Button size="sm" type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(0,100,250,0.3)]">
                {isPending ? "Transmitting..." : "Sync Preferences"}
             </Button>
          </form>
        )}
      </div>
    </div>
  )
}
