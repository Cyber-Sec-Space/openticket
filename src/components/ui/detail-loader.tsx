"use client"

import { useState, useEffect } from "react"
import { ShieldCheck, ShieldAlert, Lock, ScanLine, Activity } from "lucide-react"

export default function DetailLoader() {
  const [loadingText, setLoadingText] = useState("INITIALIZING SECURE HANDSHAKE...")
  
  useEffect(() => {
    const messages = [
      "ESTABLISHING SECURE CONNECTION...",
      "DECRYPTING TELEMETRY PAYLOAD...",
      "BYPASSING QUARANTINE ZONES...",
      "VERIFYING IDENTITY HASH...",
      "MOUNTING ISOLATED ENVIRONMENT...",
      "RENDERING CRITICAL DATA..."
    ]
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length
      setLoadingText(messages[msgIdx])
    }, 800)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-100px)] flex items-center justify-center animate-fade-in-up">
      <div className="w-full max-w-lg glass-card flex flex-col items-center justify-center p-12 rounded-2xl border border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Background Radar FX */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
           <div className="w-96 h-96 rounded-full border border-primary/30 animate-[spin_4s_linear_infinite] relative">
              <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-primary/50 origin-bottom blur-[1px]"></div>
           </div>
           <div className="w-64 h-64 rounded-full border border-primary/20 animate-ping absolute duration-1000"></div>
        </div>

        {/* Core Icon Animation */}
        <div className="relative z-10 mb-8 mt-4">
          <div className="absolute inset-0 border-[3px] border-transparent border-t-primary border-l-primary rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-[2px] border-transparent border-b-cyan-500 border-r-cyan-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          
          <div className="w-24 h-24 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,200,0.2)]">
            <ScanLine className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </div>

        {/* Tactical Text readout */}
        <div className="z-10 text-center space-y-4">
          <h2 className="text-xl font-bold tracking-[0.2em] text-white">
            RETRIEVING RECORD
          </h2>
          <div className="h-6 flex items-center justify-center">
            <p className="text-xs font-mono text-primary/80 uppercase tracking-widest animate-pulse">
              {loadingText}
            </p>
          </div>
          
          {/* Progress Bar Mock */}
          <div className="w-full h-1 bg-white/5 rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-primary animate-[translate_2s_ease-in-out_infinite] w-1/3 rounded-full relative shadow-[0_0_10px_rgba(0,255,150,0.8)]">
               <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
