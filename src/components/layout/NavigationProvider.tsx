"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface NavContextType {
  pendingPath: string | null;
  setPendingPath: (path: string | null) => void;
}

const NavContext = createContext<NavContextType>({ pendingPath: null, setPendingPath: () => {} })

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const pathname = usePathname()

  // Clear the pending state when the pathname actually changes, indicating
  // that Next.js has successfully fetched the RSC payload and completed the transition.
  useEffect(() => {
    setPendingPath(null)
  }, [pathname])

  return (
    <NavContext.Provider value={{ pendingPath, setPendingPath }}>
      {children}
    </NavContext.Provider>
  )
}

export function NavigationContent({ children }: { children: React.ReactNode }) {
  const { pendingPath } = useNavigationOverride()
  const pathname = usePathname()

  if (pendingPath && pendingPath !== pathname) {
    return (
      <div className="flex-1 flex flex-col p-6 w-full h-full animate-in fade-in duration-200">
         <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full">
            {/* Universal Instant Loading Skeleton */}
            <div className="flex justify-between items-center mb-6">
               <div className="h-8 w-48 bg-white/5 rounded-md animate-pulse"></div>
               <div className="h-10 w-32 bg-white/5 rounded-md animate-pulse"></div>
            </div>
            <div className="h-24 w-full bg-white/5 rounded-xl animate-pulse"></div>
            <div className="space-y-3">
               <div className="h-16 w-full bg-white/5 rounded-xl animate-pulse"></div>
               <div className="h-16 w-full bg-white/5 rounded-xl animate-pulse"></div>
               <div className="h-16 w-full bg-white/5 rounded-xl animate-pulse"></div>
            </div>
         </div>
      </div>
    )
  }

  return <>{children}</>
}

export const useNavigationOverride = () => useContext(NavContext)
