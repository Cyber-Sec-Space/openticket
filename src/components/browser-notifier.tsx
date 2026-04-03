"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function BrowserNotifier({ isEnabled }: { isEnabled?: boolean }) {
  const pathname = usePathname()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Only run if the user has enabled it and browser supports it.
    if (!isEnabled || typeof window === 'undefined' || !('Notification' in window)) {
       return
    }

    if (Notification.permission === "granted") {
      startPolling()
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          startPolling()
        }
      })
    }

    return () => stopPolling()
  }, [isEnabled, pathname])

  const startPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    // Initial fetch
    fetchAlerts()

    // Smart polling every 15 seconds
    intervalRef.current = setInterval(fetchAlerts, 15000)
  }

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const fetchAlerts = async () => {
     try {
       const res = await fetch('/api/notifications/sync')
       if (!res.ok) return
       
       const alerts = await res.json() as any[]
       for (const alert of alerts) {
         const notification = new Notification(alert.title, {
           body: alert.body,
           icon: '/logo.png', // Fallback, assuming public/logo.png
           badge: '/logo.png',
           requireInteraction: true
         })

         if (alert.link) {
            notification.onclick = function () {
              window.focus();
              if (typeof alert.link === "string" && alert.link.startsWith('/')) {
                 window.location.pathname = alert.link;
              }
              this.close();
            }
         }
       }
     } catch (err) {
        console.error("Alert Sync dropped payload:", err)
     }
  }

  return null
}
