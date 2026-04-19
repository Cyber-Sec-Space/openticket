"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ShieldAlert, Server, Home, LogOut, Users, FileText, Settings, Bug, Sliders, LayoutDashboard, ToyBrick, Key } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigationOverride } from "./NavigationProvider"

export function Sidebar({ userPermissions, enabledPlugins = [] }: { userPermissions?: string[], enabledPlugins?: string[] }) {
  const pathname = usePathname()
  const { setPendingPath } = useNavigationOverride()

  const coreNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Incidents", href: "/incidents", icon: ShieldAlert },
  ]

  if (userPermissions?.includes('VIEW_ASSETS')) {
    coreNavItems.push({ name: "Assets", href: "/assets", icon: Server })
  }
  if (userPermissions?.includes('VIEW_VULNERABILITIES')) {
    coreNavItems.push({ name: "Vulnerabilities", href: "/vulnerabilities", icon: Bug })
  }

  const adminNavItems: any[] = []
  if (userPermissions?.includes('VIEW_AUDIT_LOGS')) {
    adminNavItems.push({ name: "Audit Logs", href: "/audit", icon: FileText })
  }
  if (userPermissions?.includes('VIEW_USERS') || userPermissions?.includes('CREATE_USERS')) {
    adminNavItems.push({ name: "Users", href: "/users", icon: Users })
  }
  if (userPermissions?.includes('VIEW_ROLES') || userPermissions?.includes('CREATE_ROLES') || userPermissions?.includes('UPDATE_ROLES')) {
    adminNavItems.push({ name: "Roles Config", href: "/users/roles", icon: Key })
  }
  if (userPermissions?.includes('VIEW_SYSTEM_SETTINGS') || userPermissions?.includes('UPDATE_SYSTEM_SETTINGS')) {
    adminNavItems.push({ name: "System Config", href: "/system", icon: Sliders })
  }
  if (userPermissions?.includes('VIEW_PLUGINS') || userPermissions?.includes('INSTALL_PLUGINS') || userPermissions?.includes('TOGGLE_PLUGINS') || userPermissions?.includes('CONFIGURE_PLUGINS')) {
    adminNavItems.push({ name: "Plugins", href: "/settings/plugins", icon: ToyBrick })
  }

  // --- PLUGIN NAVIGATION INJECTION ---
  const [pluginNavItems, setPluginNavItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (enabledPlugins.length > 0) {
      import("@/plugins").then(({ activePlugins }) => {
         const items: any[] = [];
         activePlugins.forEach(p => {
            if (enabledPlugins.includes(p.manifest.id) && p.ui?.pages) {
               p.ui.pages.forEach(page => {
                 items.push({
                   name: page.title,
                   href: `/plugins/${p.manifest.id}/${page.routeUrl}`,
                   icon: page.icon || ToyBrick
                 });
               });
            }
         });
         setPluginNavItems(items);
      }).catch(err => console.error("Failed to load plugin navigation:", err));
    }
  }, [enabledPlugins]);

  const personalNavItems = [
    { name: "Settings", href: "/settings", icon: Settings }
  ]

  const NavGroup = ({ items, title }: { items: any[], title?: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {title && <div className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2 mt-4">{title}</div>}
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && !(item.href === "/settings" && pathname.startsWith("/settings/plugins")) && !(item.href === "/users" && pathname.startsWith("/users/roles")))
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                if (pathname !== item.href && !(item.href !== "/" && pathname.startsWith(item.href))) {
                  setPendingPath(item.href);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-300 relative group overflow-hidden",
                isActive 
                  ? "text-primary-foreground bg-primary shadow-[0_0_15px_rgba(0,255,200,0.2)] font-medium" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-50" />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="w-64 h-screen border-r border-border/40 glass-panel bg-background/50 flex flex-col fixed left-0 top-0 z-40 hidden md:flex">
      <div className="flex h-16 items-center px-6 border-b border-border/40">
        <img src="/logo.png" alt="OpenTicket Logo" className="mr-3 w-7 h-7" />
        <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
          OpenTicket
        </span>
      </div>
      
      <nav className="flex-1 py-6 px-4 overflow-y-auto custom-scrollbar">
        <NavGroup items={coreNavItems} />
        <NavGroup items={adminNavItems} title="Administration" />
        <NavGroup items={pluginNavItems} title="Extensions" />
        <NavGroup items={personalNavItems} title="Personal" />
      </nav>

      <div className="p-4 border-t border-border/40">
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-muted-foreground hover:text-white hover:bg-destructive/80 transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
