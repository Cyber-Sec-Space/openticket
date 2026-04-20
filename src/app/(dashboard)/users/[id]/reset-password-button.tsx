"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Key } from "lucide-react"

import { adminResetPasswordAction } from "./reset-password-action"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const handleReset = async () => {
    try {
      setIsLoading(true)
      const res = await adminResetPasswordAction(userId)
      
      if (res.mode === 'email') {
        window.alert("Password reset email transmitted successfully.")
        setIsOpen(false)
      } else if (res.mode === 'manual' && res.tempPassword) {
        setTempPassword(res.tempPassword)
        // Only show alert if it's necessary, though the dialog is enough
      }
    } catch (error: any) {
      window.alert(error.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setTempPassword(null)
  }

  return (
    <>
      <Button 
        variant="outline" 
        className="border-yellow-500/50 text-yellow-400 bg-yellow-950/20 hover:bg-yellow-500/10"
        onClick={() => setIsOpen(true)}
      >
        <Key className="w-4 h-4 mr-2" />
        Reset Password
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px] bg-black/90 border border-white/10 text-white shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-red-400 font-bold flex items-center gap-2">
              <Key className="w-5 h-5" />
              Administrative Password Reset
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {tempPassword 
                ? "A temporary password has been generated. Ensure you communicate this securely to the operator."
                : "Are you sure you want to forcibly reset this operator's password? This will invalidate their current credentials."}
            </DialogDescription>
          </DialogHeader>
          
          {tempPassword ? (
            <div className="py-6">
              <div className="bg-zinc-950 border border-white/10 rounded-md p-4 flex items-center justify-between">
                <code className="text-xl font-mono text-emerald-400 select-all tracking-wider font-bold">
                  {tempPassword}
                </code>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    window.alert("Copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-yellow-500/80 mt-4 text-center font-mono uppercase tracking-widest">
                Warning: This is the only time this password will be shown.
              </p>
            </div>
          ) : (
            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button variant="ghost" onClick={handleClose} disabled={isLoading} className="text-zinc-400 hover:text-white">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReset} disabled={isLoading} className="bg-red-900 border border-red-500/30">
                {isLoading ? "Executing..." : "Confirm Override"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
