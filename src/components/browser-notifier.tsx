"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function BrowserNotifier({ isEnabled }: { isEnabled?: boolean }) {
  const pathname = usePathname()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Only run if the user has enabled it and browser supports it.
    if (!isEnabled || typeof window === 'undefined' || !('Notification' in window)) {
       return
    }

    if (Notification.permission === "granted") {
      startListening()
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          startListening()
        }
      })
    }

    return () => stopListening()
  }, [isEnabled, pathname])

  const startListening = () => {
    if (eventSourceRef.current) return;

    const source = new EventSource('/api/notifications/stream');
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data);
        const notification = new Notification(alert.title, {
          body: alert.body,
          icon: '/logo.png', // Fallback, assuming public/logo.png
          badge: '/logo.png',
          requireInteraction: true
        });

        if (alert.link) {
           notification.onclick = function () {
             window.focus();
             if (typeof alert.link === "string" && alert.link.startsWith('/')) {
                window.location.pathname = alert.link;
             }
             this.close();
           }
        }
      } catch (err) {
        console.error("Failed to parse SSE alert stream payload:", err);
      }
    };

    source.onerror = () => {
       // Reconnect handled natively by EventSource, but we can log it
       console.warn("SSE connection interrupted. Reconnecting automatically...");
    };
  }

  const stopListening = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  return null
}
