"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, Mail, Plus, Trash2, Ban, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { bulkDeleteUsersAction, bulkUpdateRoleAction, toggleUserStatusAction } from "./actions"

export function UserTableClient({ users, sessionUserId }: { users: any[], sessionUserId: string }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRole, setBulkRole] = useState<string>("REPORTER")
  const [isProcessing, setIsProcessing] = useState(false)

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
    }
  }

  const toggleOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleBulkDelete = async () => {
    if (!confirm("Are you sure you want to delete these users? Orphaned records will be retained.")) return
    setIsProcessing(true)
    await bulkDeleteUsersAction(Array.from(selectedIds))
    setSelectedIds(new Set())
    setIsProcessing(false)
  }

  const handleBulkRoleUpdate = async () => {
    if (!confirm(`Update Role to ${bulkRole} for selected users?`)) return
    setIsProcessing(true)
    await bulkUpdateRoleAction(Array.from(selectedIds), bulkRole as any)
    setSelectedIds(new Set())
    setIsProcessing(false)
  }

  const handleDisableToggle = async (id: string, currentlyDisabled: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(currentlyDisabled ? "Restore this operator's platform access?" : "Suspend this operator and revoke active sessions?")) return
    setIsProcessing(true)
    await toggleUserStatusAction(id, !currentlyDisabled)
    setIsProcessing(false)
  }

  return (
    <div className="space-y-4">
      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 font-mono border-emerald-500/30">
               {selectedIds.size} Selected
             </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={bulkRole} onValueChange={(val) => val && setBulkRole(val)}>
              <SelectTrigger className="h-8 w-[120px] bg-black/50 text-xs text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REPORTER">REPORTER</SelectItem>
                <SelectItem value="SECOPS">SECOPS</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 text-xs" onClick={handleBulkRoleUpdate} disabled={isProcessing}>
               Set Role
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/40" onClick={handleBulkDelete} disabled={isProcessing}>
               <Trash2 className="w-3 h-3 mr-2" /> Expunge Selected
            </Button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl relative">
        {isProcessing && <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center font-mono text-emerald-400 animate-pulse text-sm">TRANSMITTING...</div>}
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
               <TableHead className="w-12 pl-6">
                 <Checkbox 
                   checked={selectedIds.size > 0 && selectedIds.size === users.length} 
                   onClick={toggleAll}
                   className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                 />
               </TableHead>
               <TableHead className="font-semibold text-primary">Identity Profile (UID)</TableHead>
               <TableHead className="font-semibold text-primary">Contact (Email)</TableHead>
               <TableHead className="font-semibold text-primary text-center">Status</TableHead>
               <TableHead className="font-semibold text-primary text-center">Current Privilege Tier</TableHead>
               <TableHead className="font-semibold text-primary text-right pr-6">Direct Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                   Zero active agents resolved.
                 </TableCell>
               </TableRow>
            ) : users.map(user => {
               const isSelected = selectedIds.has(user.id)
               const isSelf = user.id === sessionUserId
               return (
                <TableRow 
                  key={user.id} 
                  className={`hover:bg-emerald-400/5 cursor-pointer border-border transition-colors ${isSelected ? 'bg-emerald-950/20' : ''}`}
                  onClick={() => router.push(`/users/${user.id}`)}
                >
                  <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                       checked={isSelected}
                       disabled={isSelf}
                       onClick={(e) => toggleOne(user.id, e as any)}
                       className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center border border-white/5 ${user.isDisabled ? 'from-red-500/20 to-red-900/40 text-red-500' : 'from-emerald-400/20 to-primary/20 text-emerald-400'}`}>
                         <span className="text-xs font-mono font-bold">{user.name?.charAt(0).toUpperCase() || "U"}</span>
                      </div>
                      <div>
                        <span className="block text-sm leading-none mb-1">{user.name || "Default Originator"}</span>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-50 block leading-none">ID-{user.id.substring(0,8).toUpperCase()}</span>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-muted-foreground font-mono text-xs">
                     <Mail className="w-3 h-3 inline mr-2 opacity-50 text-primary" />
                     {user.email || "Orphaned Account"}
                  </TableCell>

                  <TableCell className="text-center">
                    {user.isDisabled ? (
                      <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-950/30 text-[10px]">SUSPENDED</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/30 text-[10px]">ACTIVE</Badge>
                    )}
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

                  <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                     {/* Admins shouldn't casually alter themselves through this module to prevent locking out of root keys */}
                     {isSelf ? (
                       <span className="text-[10px] text-primary/50 font-mono tracking-widest">[ SELF MODULE ]</span>
                     ) : (
                     <div className="flex justify-end items-center gap-1">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className={`h-8 w-8 ${user.isDisabled ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10' : 'text-orange-400 hover:text-orange-300 hover:bg-orange-400/10'}`}
                         title={user.isDisabled ? "Restore Access" : "Suspend Operator"}
                         onClick={(e) => handleDisableToggle(user.id, user.isDisabled, e)}
                       >
                         {user.isDisabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                       </Button>
                     </div>
                     )}
                  </TableCell>
                </TableRow>
               )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
