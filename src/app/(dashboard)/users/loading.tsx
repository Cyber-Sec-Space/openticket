import { UserCog } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function UsersLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserCog className="mr-3 text-emerald-500/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-64 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-80 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
        <div>
          <div className="h-10 w-44 bg-emerald-500/20 rounded-md animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl relative">
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-border">
                 <TableHead className="w-12 pl-6">
                   <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
                 </TableHead>
                 <TableHead className="font-semibold text-primary/50">Identity Profile (UID)</TableHead>
                 <TableHead className="font-semibold text-primary/50">Contact (Email)</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-center">Status</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-center">Current Privilege Tier</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-right pr-6">Direct Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell className="pl-6">
                     <div className="h-4 w-4 bg-white/5 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse"></div>
                      <div className="flex flex-col gap-1">
                        <div className="h-3 w-32 bg-white/10 rounded animate-pulse"></div>
                        <div className="h-2 w-20 bg-white/5 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-3 w-40 bg-white/5 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="h-5 w-16 bg-white/5 rounded border border-white/5 mx-auto animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="h-5 w-24 bg-white/10 rounded border border-white/5 mx-auto animate-pulse"></div>
                  </TableCell>
                  <TableCell className="pr-6 text-right py-4">
                    <div className="flex justify-end items-center gap-1">
                      <div className="h-8 w-8 bg-white/5 rounded-md animate-pulse"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
