"use client"

import { useActionState } from "react"
import { authenticate } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)

  return (
    <form action={dispatch} className="space-y-6 mt-8">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-muted-foreground">Email</Label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          placeholder="admin@openticket.local" 
          className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-primary backdrop-blur-md"
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-muted-foreground">Password</Label>
        <Input 
          id="password" 
          name="password" 
          type="password"
          className="bg-black/20 border-white/10 text-white focus-visible:ring-primary backdrop-blur-md"
          required 
        />
      </div>
      
      {errorMessage && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          {errorMessage}
        </div>
      )}

      <Button 
        className="w-full h-12 text-md mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,255,200,0.3)] transition-all" 
        type="submit" 
        disabled={isPending}
      >
        {isPending ? "Authenticating..." : "Access Portal"}
      </Button>
    </form>
  )
}
