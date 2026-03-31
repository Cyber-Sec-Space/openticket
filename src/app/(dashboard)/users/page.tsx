import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, UserCog, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmForm } from "@/components/ui/confirm-form"
import { updateUserRole } from "./actions"
import { Button } from "@/components/ui/button"

export default async function UsersPage() {
  const session = await auth()
  
  // Security Perimeter: Only ADMIN handles User configurations
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const users = await db.user.findMany({
    orderBy: { email: 'asc' } 
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserCog className="mr-3 text-emerald-400 h-8 w-8" /> Identity Integration Map
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Assign structural responsibilities shaping the defense-in-depth model.</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
               <TableHead className="font-semibold text-primary pl-6">Identity Profile (UID)</TableHead>
               <TableHead className="font-semibold text-primary">Contact (Email)</TableHead>
               <TableHead className="font-semibold text-primary text-center">Current Privilege Tier</TableHead>
               <TableHead className="font-semibold text-primary text-right pr-6">Management Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                   Zero active agents resolved.
                 </TableCell>
               </TableRow>
            ) : users.map(user => (
               <TableRow key={user.id} className="hover:bg-emerald-400/5 border-border transition-colors">
                 <TableCell className="font-medium text-foreground py-4 pl-6">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/20 to-primary/20 flex items-center justify-center border border-white/5">
                        <span className="text-xs font-mono font-bold text-emerald-400">{user.name?.charAt(0).toUpperCase() || "U"}</span>
                     </div>
                     <div>
                       <span className="block text-sm">{user.name || "Default Originator"}</span>
                       <span className="text-[10px] font-mono text-muted-foreground opacity-50 block">ID-{user.id.substring(0,8).toUpperCase()}</span>
                     </div>
                   </div>
                 </TableCell>
                 
                 <TableCell className="text-muted-foreground font-mono text-xs">
                    <Mail className="w-3 h-3 inline mr-1 opacity-50" />
                    {user.email || "Orphaned Account"}
                 </TableCell>

                 <TableCell className="text-center">
                    <Badge variant="outline" className={`bg-transparent border ${
                      user.role === 'ADMIN' ? 'border-primary/50 text-primary bg-primary/10' :
                      user.role === 'SECOPS' ? 'border-blue-400/50 text-blue-400 bg-blue-400/10' :
                      'border-muted-foreground/30 text-muted-foreground bg-black/20'
                    }`}>
                      {user.role}
                      {user.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 ml-1" />}
                    </Badge>
                 </TableCell>

                 <TableCell className="text-right pr-6">
                    {/* Admins shouldn't casually alter themselves through this module to prevent locking out of root keys */}
                    {user.id === session.user.id ? (
                      <span className="text-xs text-muted-foreground italic mr-2 opacity-50">Authorized Origin Limit</span>
                    ) : (
                      <ConfirmForm action={updateUserRole} promptMessage={`Permit role manipulation for ${user.email}? This enacts immediate platform-wide policy shifts.`}>
                         <div className="flex justify-end gap-2 items-center">
                            <input type="hidden" name="userId" value={user.id} />
                            <Select name="role" defaultValue={user.role}>
                              <SelectTrigger className="h-8 w-[130px] px-3 rounded-md border border-white/5 bg-black/50 text-xs text-foreground focus:ring-1 focus:ring-emerald-400 outline-none transition-all mr-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/95 shadow-2xl backdrop-blur-md">
                                <SelectItem value="REPORTER">REPORTER</SelectItem>
                                <SelectItem value="SECOPS" className="text-blue-400">SECOPS</SelectItem>
                                <SelectItem value="ADMIN" className="text-primary font-bold">ADMIN</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="submit" variant="outline" size="sm" className="bg-black/20 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10 h-8 text-xs font-mono">
                               SET
                            </Button>
                         </div>
                      </ConfirmForm>
                    )}
                 </TableCell>
               </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
