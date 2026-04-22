import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import { NavigationProvider, NavigationContent } from "@/components/layout/NavigationProvider"
import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BrowserNotifier } from "@/components/browser-notifier"
import { TwoFactorPanel } from "./settings/two-factor-panel"

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  console.log(`[LAYOUT] Session User ID: ${session?.user?.id || 'null'}`);
  if (!session?.user?.id) {
    console.log(`[LAYOUT] Redirecting to clearsession...`);
    redirect("/login?clearsession=true")
  }

  const userConfig = await db.user.findUnique({
    where: { id: session.user.id },
    select: { browserNotificationsEnabled: true, isDisabled: true, isTwoFactorEnabled: true, twoFactorSecret: true }
  })
  
  if (!userConfig || userConfig.isDisabled) {
    redirect("/login?clearsession=true")
  }
  
  if (session.user.requires2FASetup) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative selection:bg-primary/30">
        <div className="max-w-2xl w-full glass-card p-6 md:p-8 rounded-xl border border-destructive/30 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
          <h2 className="text-2xl font-extrabold text-destructive tracking-tight mb-2 uppercase flex items-center">
            <span className="relative flex h-3 w-3 mr-3 shadow-[0_0_10px_rgba(255,50,50,0.8)]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Security Interlock Engagement
          </h2>
          <p className="text-sm text-foreground/80 mb-6 font-mono tracking-tight leading-relaxed">
            The platform operators have structurally enforced Global 2FA. You <b className="text-white">MUST</b> synchronize a Time-based OTP authenticator device before interacting with internal SOC assets.
          </p>
          <div className="bg-black/40 border border-white/5 rounded-xl p-6 relative z-10">
            <TwoFactorPanel isEnabled={false} />
          </div>
          <div className="mt-8 flex justify-center relative z-10 w-full pt-4 border-t border-white/10">
            <form action={async () => {
              "use server"
              await signOut({ redirectTo: "/login?clearsession=true" })
            }}>
              <button type="submit" className="text-xs text-muted-foreground hover:text-red-400 uppercase tracking-widest outline-none transition-colors">
                 Abort & Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  const activePluginStates = await db.pluginState.findMany({ 
    where: { isActive: true },
    select: { id: true }
  })
  const enabledPlugins = activePluginStates.map(s => s.id)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrowserNotifier isEnabled={userConfig.browserNotificationsEnabled || false} />
      <NavigationProvider>
        <div className="block md:hidden">
          <MobileNav userPermissions={session?.user?.permissions as string[]} enabledPlugins={enabledPlugins} />
        </div>
        <div className="flex w-full min-h-screen">
          <Sidebar userPermissions={session?.user?.permissions as string[]} enabledPlugins={enabledPlugins} />
          <main className="flex-1 w-full min-w-0 md:pl-64 flex flex-col relative animate-fade-in-up min-h-[100dvh]">
            <NavigationContent>
              <div className="flex-1 flex flex-col w-full h-full">
                {children}
              </div>
            </NavigationContent>
            <footer className="w-full py-6 mt-auto border-t border-white/5 bg-black/10">
              <p className="opacity-50 text-xs text-center font-mono text-white/80">Copyright © 2026 Cyber Sec Space. All rights reserved.</p>
            </footer>
          </main>
        </div>
      </NavigationProvider>
    </div>
  )
}
