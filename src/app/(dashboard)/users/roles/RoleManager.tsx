"use client"

import { useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { createRole, updateRole, deleteRole } from "./actions"
import { Shield, ShieldAlert, Key, Trash2, Edit3, Settings, Plus, Users as UsersIcon, ChevronDown, ChevronRight } from "lucide-react"

export function RoleManager({ roles, availablePermissions }: { roles: any[], availablePermissions: string[] }) {
  const [isPending, startTransition] = useTransition()
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  // Form State
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Permission Categories configuration
  const groupedPermissions: Record<string, string[]> = {
    "Incidents": availablePermissions.filter(p => p.includes("INCIDENT")),
    "Collaboration": availablePermissions.filter(p => ['VIEW_TEAMS','MANAGE_TEAMS'].includes(p)),
    "Assets": availablePermissions.filter(p => ['VIEW_ASSETS','CREATE_ASSETS','UPDATE_ASSETS','DELETE_ASSETS'].includes(p)),
    "Vulnerabilities": availablePermissions.filter(p => !!p.match(/VULN/)),
    "Identity & Access Management": availablePermissions.filter(p => p.includes("USER") || p.includes("ROLE")),
    "System Operations": availablePermissions.filter(p => ['VIEW_DASHBOARD','VIEW_SYSTEM_SETTINGS','UPDATE_SYSTEM_SETTINGS','MANAGE_INTEGRATIONS','VIEW_AUDIT_LOGS','EXPORT_DATA'].includes(p)),
    "API & Bots": availablePermissions.filter(p => !!p.match(/API/))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const toggleCategorySelectAll = (category: string, permissions: string[]) => {
    const areAllSelected = permissions.every(p => selectedPerms.includes(p))
    if (areAllSelected) {
       setSelectedPerms(prev => prev.filter(p => !permissions.includes(p)))
    } else {
       const newSelection = new Set([...selectedPerms, ...permissions])
       setSelectedPerms(Array.from(newSelection))
    }
  }

  const openDialog = (role?: any) => {
    setErrorMsg("")
    if (role) {
      setEditingRole(role)
      setName(role.name)
      setDescription(role.description || "")
      setSelectedPerms(role.permissions || [])
    } else {
      setEditingRole(null)
      setName("")
      setDescription("")
      setSelectedPerms([])
    }
    setIsDialogOpen(true)
  }

  const handleTogglePerm = (perm: string) => {
    setSelectedPerms(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const handleSave = () => {
    setErrorMsg("")
    const formData = new FormData()
    if (editingRole) formData.append("id", editingRole.id)
    formData.append("name", name)
    formData.append("description", description)
    selectedPerms.forEach(p => formData.append("permissions", p))

    startTransition(async () => {
      try {
        if (editingRole) {
           await updateRole(formData)
        } else {
           await createRole(formData)
        }
        setIsDialogOpen(false)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  const handleDelete = (role: any) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete the role "${role.name}"?\n\n` + 
      `Users currently containing this role will NOT be deleted, but this role will be removed from them. If a user is left with no roles, they will automatically be assigned the 'Reporter' fallback role.\n\n` +
      `This action cannot be undone.`
    )
    if (!isConfirmed) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("id", role.id)
        await deleteRole(formData)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <>
      {/* Top Controls */}
      <div className="flex justify-end mb-6">
        <button 
           onClick={() => openDialog()}
           disabled={isPending}
           className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center shadow-[0_0_15px_rgba(0,255,200,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Custom Role
        </button>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="relative border border-border/40 bg-card rounded-xl p-6 shadow-sm flex flex-col hover:border-primary/50 transition-colors overflow-hidden group">
            
            {/* System Immutable Badge BG */}
            {role.isSystem && (
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <ShieldAlert className="w-32 h-32" />
               </div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {role.name}
                  {role.isSystem && <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground tracking-wider">System</span>}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {role.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-foreground/80 mb-6 bg-background/50 w-fit px-3 py-1.5 rounded-md border border-white/5 relative z-10">
               <UsersIcon className="w-4 h-4 text-primary" />
               <span className="font-semibold">{role._count.users}</span> users assigned
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 relative z-10">
                {role.permissions.slice(0, 5).map((p: string) => (
                  <span key={p} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded flex items-center font-mono">
                    {p.replace(/_/g, ' ')}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="text-[10px] bg-muted text-muted-foreground border border-border/50 px-2 py-0.5 rounded flex items-center font-mono">
                    +{role.permissions.length - 5} more
                  </span>
                )}
                {role.permissions.length === 0 && (
                   <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded font-mono">No Permissions</span>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-border/30 pt-4 gap-2 relative z-10">
              {role.isSystem ? (
                <>
                  <div className="text-xs text-muted-foreground italic truncate">System role permissions cannot be altered.</div>
                  <button 
                    onClick={() => openDialog(role)}
                    disabled={isPending}
                    className="flex items-center px-3 py-1.5 text-xs font-semibold hover:bg-white/10 rounded transition-colors ml-auto"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" /> View Details
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => openDialog(role)}
                    disabled={isPending}
                    className="flex items-center px-3 py-1.5 text-xs font-semibold hover:bg-white/10 rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(role)}
                    disabled={isPending}
                    className="flex items-center px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Editor Dialog */}
      {isDialogOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center isolate">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isPending && setIsDialogOpen(false)} />
          
          <div className="relative bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-10 m-4 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border/40">
              <h2 className="text-xl font-bold flex items-center">
                {editingRole ? (editingRole.isSystem ? <Shield className="w-5 h-5 mr-2 text-primary" /> : <Edit3 className="w-5 h-5 mr-2 text-primary" />) : <Plus className="w-5 h-5 mr-2 text-primary" />}
                {editingRole ? (editingRole.isSystem ? "View System Role" : "Edit Role") : "Create Custom Role"}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {errorMsg && (
                <div className="bg-destructive/10 border border-destructive/40 text-destructive p-3 rounded-md text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold tracking-wide text-foreground/80">Role Identifier</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Auditor"
                    className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground disabled:opacity-60"
                    disabled={isPending || editingRole?.isSystem}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold tracking-wide text-foreground/80">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for this role..."
                    rows={2}
                    className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-foreground disabled:opacity-60"
                    disabled={isPending || editingRole?.isSystem}
                  />
                </div>
              </div>

              <div className="border border-border/30 rounded-lg overflow-hidden bg-black/20">
                 <div className="bg-muted/30 p-4 border-b border-border/30">
                     <h3 className="font-semibold text-sm">Privilege Blueprint Matrix</h3>
                     <p className="text-xs text-muted-foreground mt-1">Configure atomic capabilities logically divided by domain.</p>
                 </div>
                 
                 <div className="flex flex-col">
                    {Object.entries(groupedPermissions).map(([category, perms]) => {
                       const isExpanded = !!expandedCategories[category]
                       const selectedCount = perms.filter(p => selectedPerms.includes(p)).length
                       const areAllSelected = selectedCount === perms.length && perms.length > 0
                       
                       return (
                         <div key={category} className="border-b border-border/20 last:border-0 relative">
                             {/* Accordion Trigger */}
                             <div 
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors select-none"
                                onClick={() => toggleCategory(category)}
                             >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                  <span className="text-sm font-medium">{category}</span>
                                  {selectedCount > 0 && (
                                    <span className="text-[10px] ml-2 font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                      {selectedCount}/{perms.length} active
                                    </span>
                                  )}
                                </div>
                                <button 
                                   className="text-xs text-primary hover:underline hover:text-primary-foreground select-none disabled:opacity-50 disabled:no-underline"
                                   onClick={(e) => { e.stopPropagation(); toggleCategorySelectAll(category, perms) }}
                                   disabled={isPending || editingRole?.isSystem}
                                >
                                   {areAllSelected ? 'Deselect All' : 'Select All'}
                                </button>
                             </div>

                             {/* Accordion Content */}
                             {isExpanded && (
                               <div className="p-4 pt-1 bg-black/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {perms.map(perm => {
                                   const isSelected = selectedPerms.includes(perm)
                                   return (
                                     <label key={perm} className="flex items-start gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                           <input 
                                              type="checkbox" 
                                              className="w-4 h-4 cursor-pointer opacity-0 absolute z-10 disabled:cursor-not-allowed" 
                                              checked={isSelected}
                                              onChange={() => handleTogglePerm(perm)}
                                              disabled={isPending || editingRole?.isSystem}
                                           />
                                           <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground group-hover:border-primary/50'}`}>
                                              {isSelected && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                                           </div>
                                        </div>
                                        <span className={`text-[11px] leading-tight font-mono tracking-tight pt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                           {perm}
                                        </span>
                                     </label>
                                   )
                                 })}
                               </div>
                             )}
                         </div>
                       )
                    })}
                 </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
               <button 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-colors"
               >
                 Cancel
               </button>
               {!editingRole?.isSystem && (
                 <button 
                    onClick={handleSave}
                    disabled={isPending || !name.trim()}
                    className="bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center"
                 >
                   {isPending && <div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin mr-2" />}
                   {editingRole ? "Save Changes" : "Create Role"}
                 </button>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
