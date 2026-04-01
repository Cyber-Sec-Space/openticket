"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ShieldAlert, Server, Home, LogOut, Users, FileText, Settings, Bug, Sliders, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav({ userRole }: { userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Incidents", href: "/incidents", icon: ShieldAlert },
    { name: "Assets", href: "/assets", icon: Server },
  ]

  if (userRole === 'ADMIN' || userRole === 'SECOPS') {
    navItems.push({ name: "Vulnerabilities", href: "/vulnerabilities", icon: Bug })
    navItems.push({ name: "Audit Logs", href: "/audit", icon: FileText })
  }
  
  if (userRole === 'ADMIN') {
    navItems.push({ name: "Users", href: "/users", icon: Users })
    navItems.push({ name: "System Config", href: "/system", icon: Sliders })
  }

  navItems.push({ name: "Settings", href: "/settings", icon: Settings })

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border/40 glass-panel bg-black/60 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center">
          <ShieldAlert className="w-6 h-6 text-primary mr-2" />
          <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            OpenTicket
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-white transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
          />
          <aside className="w-[80vw] max-w-sm h-full glass-panel bg-background/95 border-r border-border/40 flex flex-col relative animate-in slide-in-from-left duration-300 shadow-2xl">
            <div className="flex h-16 items-center justify-between px-6 border-b border-border/40">
              <span className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Menu
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 -mr-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 relative group overflow-hidden",
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

            <div className="p-6 border-t border-border/40 bg-black/20">
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center justify-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-sm text-destructive hover:text-white hover:bg-destructive shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all duration-300 border border-destructive/20 hover:border-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out Securely</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
