"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

export interface TabConfig {
  id: string
  label: string
  icon?: React.ReactNode
}

interface SystemTabsLayoutProps {
  tabs: TabConfig[]
  children: { [key: string]: React.ReactNode }
}

export function SystemTabsLayout({ tabs, children }: SystemTabsLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || "")

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-wrap gap-2 pb-4 border-b border-white/10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative",
                isActive 
                  ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-primary/50" 
                  : "text-muted-foreground hover:bg-black/30 hover:text-white"
              )}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {isActive && (
                <div className="absolute -bottom-4 left-0 w-full h-[2px] bg-primary animate-in fade-in zoom-in" />
              )}
            </button>
          )
        })}
      </div>

      <div className="w-full relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "w-full outline-none",
              activeTab === tab.id ? "block animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"
            )}
          >
            {children[tab.id]}
          </div>
        ))}
      </div>
    </div>
  )
}
