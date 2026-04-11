"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, MailCheck } from "lucide-react"
import { testSmtpConnection } from "./actions"

export function SmtpTestButton() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const handleTest = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    
    // Find the closest form to extract values
    const form = e.currentTarget.closest("form")
    if (!form) return
    
    setIsTesting(true)
    setResult(null)
    
    try {
      const formData = new FormData(form)
      const res = await testSmtpConnection(formData)
      setResult(res)
    } catch (error: any) {
      setResult({ error: error.message || "An unexpected error occurred." })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="flex flex-col space-y-3">
      <Button 
        variant="secondary" 
        onClick={handleTest} 
        disabled={isTesting}
        className="w-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
      >
        {isTesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying Connection...
          </>
        ) : (
          <>
            <MailCheck className="mr-2 h-4 w-4" />
            Test Connection
          </>
        )}
      </Button>

      {result && (
        <div className={`p-3 rounded-md border text-sm ${result.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {result.success ? "✅ SMTP Connection Verified Successfully!" : `❌ ${result.error}`}
        </div>
      )}
    </div>
  )
}
