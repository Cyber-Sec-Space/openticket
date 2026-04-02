"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function PluginsNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Installed Drivers",
      href: "/settings/plugins",
      exact: true
    },
    {
      name: "Plugin Store",
      href: "/settings/plugins/store",
      exact: false
    }
  ]

  return (
    <div className="flex items-center gap-4 border-b border-white/10 pb-2">
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors relative",
              isActive 
                ? "text-primary bg-primary/10 rounded-md" 
                : "text-muted-foreground hover:text-white hover:bg-white/5 rounded-md"
            )}
          >
            {item.name}
            {isActive && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary drop-shadow-[0_0_8px_currentColor]" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
