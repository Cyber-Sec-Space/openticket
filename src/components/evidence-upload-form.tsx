"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadAttachmentAction } from "@/app/actions/upload"
import { FileUploadBox } from "@/components/file-upload-box"
import { Button } from "@/components/ui/button"

export function EvidenceUploadForm({ incidentId }: { incidentId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(Date.now())

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setErrorMsg(null)

    const file = formData.get("file") as File | null
    if (file && file.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds 10MB limit. Maximum allowed size is 10MB.")
      return
    }

    startTransition(async () => {
      try {
        const result = await uploadAttachmentAction(undefined, formData)
        
        if (result?.ok) {
          setResetKey(Date.now())
          router.refresh()
        } else {
          setErrorMsg(result?.error || "Upload validation failed.")
        }
      } catch (err: any) {
        setErrorMsg(err.message || "An unexpected error occurred during upload.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-5 border-b border-border/50">
      <input type="hidden" name="incidentId" value={incidentId} />
      <div key={resetKey}>
         <FileUploadBox resetKey={resetKey} />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(100,0,255,0.2)] disabled:opacity-70"
      >
        {isPending ? "Uploading Evidence..." : "Attach Evidence"}
      </Button>
      {errorMsg ? (
        <p className="text-xs text-red-400">{errorMsg}</p>
      ) : null}
    </form>
  )
}
