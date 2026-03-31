import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Sliders, ShieldCheck, UserPlus, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSystemSettings } from "./actions"

export default async function SystemSettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect("/login")
  }

  const settings = await db.systemSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      allowRegistration: true,
      requireGlobal2FA: false,
      defaultUserRole: "REPORTER"
    }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Sliders className="w-8 h-8 mr-3 text-emerald-400" /> System Configuration
          </h1>
          <p className="text-muted-foreground mt-2">Manage global operational protocols and perimeter boundaries.</p>
        </div>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-black/20 p-6 flex flex-row items-center space-x-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <CardTitle className="text-primary tracking-wide">Platform Directives</CardTitle>
            <CardDescription>Adjust authorization routing and compliance.</CardDescription>
          </div>
        </CardHeader>

        <div className="p-6">
          <form action={updateSystemSettings} className="space-y-8">
            <div className="grid gap-6">
              
              {/* Registration Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <Checkbox id="allowRegistration" name="allowRegistration" value="on" defaultChecked={settings.allowRegistration} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="allowRegistration" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-2" /> Allow Public Registration
                  </Label>
                  <p className="text-[11px] text-muted-foreground pt-1 w-3/4">
                    Permit unauthenticated actors to generate new access credentials on the platform endpoint.
                  </p>
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <Checkbox id="requireGlobal2FA" name="requireGlobal2FA" value="on" defaultChecked={settings.requireGlobal2FA} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="requireGlobal2FA" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer text-primary">
                    <Fingerprint className="w-4 h-4 mr-2" /> Enforce Global Two-Factor Verification
                  </Label>
                  <p className="text-[11px] text-muted-foreground pt-1 w-3/4">
                    Mandate TOTP verification universally. <span className="text-destructive">(Warning: Operator accounts without configured interlocks will be structurally locked out).</span>
                  </p>
                </div>
              </div>

              {/* Default Role Select */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <Label className="text-sm font-semibold tracking-wide text-primary/80">Default Initialization Privilege</Label>
                <p className="text-[11px] text-muted-foreground pb-2">
                   Select the initial access tier granted to newly registered operators.
                </p>
                <Select name="defaultUserRole" defaultValue={settings.defaultUserRole}>
                  <SelectTrigger className="w-[180px] bg-black/50 border-white/10">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPORTER">REPORTER</SelectItem>
                    <SelectItem value="SECOPS">SECOPS</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <hr className="my-6 border-white/10" />

            <div className="flex justify-end">
               <Button type="submit" className="w-48 text-white bg-blue-600 hover:bg-blue-500 font-bold shadow-[0_0_15px_rgba(0,100,255,0.3)] tracking-widest uppercase text-xs">
                 Apply Directives
               </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
