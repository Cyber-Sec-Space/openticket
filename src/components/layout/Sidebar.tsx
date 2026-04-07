"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ShieldAlert, Server, Home, LogOut, Users, FileText, Settings, Bug, Sliders, LayoutDashboard, ToyBrick, Key } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar({ userPermissions }: { userPermissions?: string[] }) {
  const pathname = usePathname()
  

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Incidents", href: "/incidents", icon: ShieldAlert },
  ]

  // Conditionally inject modules based on granular permissions
  if (userPermissions?.includes('VIEW_ASSETS')) {
    navItems.push({ name: "Assets", href: "/assets", icon: Server })
  }
  if (userPermissions?.includes('VIEW_VULNERABILITIES')) {
    navItems.push({ name: "Vulnerabilities", href: "/vulnerabilities", icon: Bug })
  }
  if (userPermissions?.includes('VIEW_AUDIT_LOGS')) {
    navItems.push({ name: "Audit Logs", href: "/audit", icon: FileText })
  }
  if (userPermissions?.includes('VIEW_USERS') || userPermissions?.includes('CREATE_USERS')) {
    navItems.push({ name: "Users", href: "/users", icon: Users })
  }
  if (userPermissions?.includes('VIEW_ROLES') || userPermissions?.includes('MANAGE_ROLES')) {
    navItems.push({ name: "Roles Config", href: "/users/roles", icon: Key })
  }
  if (userPermissions?.includes('VIEW_SYSTEM_SETTINGS') || userPermissions?.includes('UPDATE_SYSTEM_SETTINGS')) {
    navItems.push({ name: "System Config", href: "/system", icon: Sliders })
  }
  if (userPermissions?.includes('VIEW_PLUGINS') || userPermissions?.includes('MANAGE_PLUGINS')) {
    navItems.push({ name: "Plugins", href: "/settings/plugins", icon: ToyBrick })
  }

  // Everyone can manage their own profile
  navItems.push({ name: "Settings", href: "/settings", icon: Settings })

  return (
    <aside className="w-64 h-screen border-r border-border/40 glass-panel bg-background/50 flex flex-col fixed left-0 top-0 z-40 hidden md:flex">
      <div className="flex h-16 items-center px-6 border-b border-border/40">
        <img src="/logo.png" alt="OpenTicket Logo" className="mr-3 w-7 h-7" />
        <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
          OpenTicket
        </span>
      </div>
      
      <nav className="flex-1 py-8 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && !(item.href === "/settings" && pathname.startsWith("/settings/plugins")) && !(item.href === "/users" && pathname.startsWith("/users/roles")))
          return (
            <Link
              key={item.href}
              href={item.href}
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
