import { Users, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function UsersLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Users className="mr-3 text-emerald-500/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-44 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-72 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-emerald-500/20 rounded-md animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
          <Table className="table-fixed">
            <TableHeader className="bg-black/20">
              <TableRow className="border-border">
                 <TableHead className="w-[8%] pl-6">
                   <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
                 </TableHead>
                 <TableHead className="font-semibold text-primary/50 w-[25%]">Identity Profile (UID)</TableHead>
                 <TableHead className="font-semibold text-primary/50 w-[25%] hidden md:table-cell">Contact (Email)</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-center w-[12%]">Status</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-center w-[20%] hidden sm:table-cell">Current Privilege Tier</TableHead>
                 <TableHead className="font-semibold text-primary/50 text-right pr-6 w-[10%]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell className="pl-6">
                     <div className="h-4 w-4 bg-white/5 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-4 truncate">
                    <div className="flex flex-col gap-2">
                      <div className="h-5 w-48 max-w-[250px] bg-white/10 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-white/5 rounded animate-pulse"></div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 hidden md:table-cell truncate">
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="h-6 w-16 bg-white/5 rounded-full mx-auto animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-4 text-center hidden sm:table-cell">
                    <div className="h-6 w-24 bg-white/10 rounded-full mx-auto animate-pulse"></div>
                  </TableCell>
                  <TableCell className="pr-6 text-right py-4">
                    <div className="h-8 w-8 bg-white/5 rounded-md ml-auto animate-pulse"></div>
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
