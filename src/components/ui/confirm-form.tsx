"use client"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (formData: FormData) => void | Promise<void>;
  promptMessage: string;
}

export function ConfirmForm({ action, promptMessage, children, className, ...props }: ConfirmFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormDataCache(new FormData(e.currentTarget))
    setIsOpen(true)
  }

  const confirmAndSubmit = () => {
    setIsOpen(false)
    if (formDataCache) {
      action(formDataCache)
    }
  }

  return (
    <>
      <form 
        className={className} 
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-black/90 border border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-10 bg-destructive/30 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
               <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center animate-pulse">
                 <AlertTriangle className="w-6 h-6 text-destructive" />
               </div>
               <h3 className="text-lg font-bold tracking-wide text-white">Action Required</h3>
               <p className="text-sm text-foreground/80 leading-relaxed font-medium">{promptMessage}</p>
            </div>
            <div className="flex gap-3 mt-8 w-full relative z-10">
               <Button type="button" variant="outline" className="flex-1 bg-black/40 border-white/10 hover:bg-white/10 text-white/80" onClick={() => setIsOpen(false)}>
                 Cancel
               </Button>
               <Button type="button" className="flex-1 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-semibold shadow-[0_0_15px_rgba(255,50,50,0.3)]" onClick={confirmAndSubmit}>
                 Confirm Execution
               </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
