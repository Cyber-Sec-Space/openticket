"use client"

import { useState, useTransition } from "react"
import { createVulnerabilityAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bug, Server, Loader2 } from "lucide-react"
import { MultiAssetPicker } from "@/components/ui/multi-asset-picker"

export function VulnFormClient({ assets }: { assets: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg("")
    const formData = new FormData(e.currentTarget)

    // Explicit manual validation simulating what we'd do natively
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    if (!title || !description) {
      setErrorMsg("Validation structural error: missing foundational CVE markers.")
      return
    }

    startTransition(async () => {
      try {
        const result = await createVulnerabilityAction(formData)
        if (result && result.error) {
          setErrorMsg(result.error)
        }
      } catch (err: any) {
        if (typeof err?.message === 'string' && err.message.includes('NEXT_REDIRECT')) {
          throw err;
        }
        setErrorMsg(err.message || "An unexpected error occurred while processing.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg font-mono text-sm tracking-wide shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          [SYS_ERR] {errorMsg}
        </div>
      )}

      <div className="space-y-3">
        <Label className="uppercase text-xs tracking-widest text-muted-foreground">General Nomenclature</Label>
        <Input
          name="title"
          type="text"
          required
          placeholder="e.g. Log4Shell Remote Code Execution"
          className="bg-black/30 border-white/10 focus:ring-red-500/50"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center">
            <Bug className="w-3 h-3 mr-2" /> CVE Indicator
          </Label>
          <Input
            name="cveId"
            type="text"
            placeholder="CVE-2021-44228"
            className="bg-black/30 border-white/10 focus:ring-red-500/50 uppercase placeholder:normal-case font-mono"
            disabled={isPending}
          />
        </div>

        <div className="space-y-3 flex flex-col items-end">
          <Label className="uppercase text-xs tracking-widest text-muted-foreground text-right w-full">CVSS v3 Score (0.0 - 10.0)</Label>
          <Input
            name="cvssScore"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="9.8"
            className="bg-black/30 border-white/10 focus:ring-red-500/50 text-right font-mono tracking-widest text-lg w-[120px] text-red-400"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="uppercase text-xs tracking-widest text-muted-foreground">Remediation Blueprint & Context</Label>
        <Textarea
          name="description"
          required
          className="bg-black/30 border-white/10 min-h-[150px] focus:ring-red-500/50 font-mono text-sm leading-relaxed"
          placeholder="Describe the affected vectors, proof of concepts, or link external mitigation guidelines..."
          disabled={isPending}
        />
      </div>

      <div className="space-y-3">
        <Label className="uppercase text-xs tracking-widest text-muted-foreground">Estimated Internal Threat Constraint</Label>
        <Select name="severity" defaultValue="HIGH" disabled={isPending}>
          <SelectTrigger className="bg-black/30 border-white/10">
            <SelectValue placeholder="Assign Internal Severity" />
          </SelectTrigger>
          <SelectContent className="bg-black/95 shadow-2xl">
            <SelectItem value="LOW">LOW EXPOSURE</SelectItem>
            <SelectItem value="MEDIUM" className="text-yellow-400">MEDIUM EXPOSURE</SelectItem>
            <SelectItem value="HIGH" className="text-orange-500 font-medium">HIGH EXPOSURE</SelectItem>
            <SelectItem value="CRITICAL" className="text-red-500 font-bold">CRITICAL EXPOSURE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 relative z-50">
        <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center">
          <Server className="w-3 h-3 mr-2" /> Associated Infrastructure (Multi-Select Mapping)
        </Label>
        <MultiAssetPicker assets={assets as any} disabled={isPending} />
      </div>

      <div className="pt-6 border-t border-white/10 flex justify-end">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white font-bold tracking-wide">
          {isPending ? (
             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Committing...</>
          ) : "Commit Vulnerability"}
        </Button>
      </div>
    </form>
  )
}
