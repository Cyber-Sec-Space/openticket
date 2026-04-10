import { ScrollText, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default function AuditLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ScrollText className="mr-3 text-purple-500/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-40 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-60 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground/30 mr-2" />
        <div className="flex flex-1 gap-4 items-end flex-wrap">
          <div className="space-y-1 flex-1 min-w-[300px]">
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-[150px] bg-purple-500/10 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <Table className="table-fixed">
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary/50 pl-6 w-[15%]">Timestamp</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[20%]">Operative</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[15%] hidden sm:table-cell">Domain</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[15%] hidden md:table-cell">Action</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[20%] truncate">Payload Diff</TableHead>
              <TableHead className="font-semibold text-primary/50 text-right pr-6 w-[15%]">Target Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 15 }).map((_, i) => (
              <TableRow key={i} className="border-border/50">
                <TableCell className="pl-6 py-4">
                  <div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-3/4 max-w-[150px] bg-white/10 rounded animate-pulse"></div>
                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse"></div>
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden sm:table-cell">
                  <div className="h-4 w-16 bg-purple-500/10 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="py-4 hidden md:table-cell">
                  <div className="h-5 w-20 bg-white/10 rounded-md animate-pulse"></div>
                </TableCell>
                <TableCell className="py-4 truncate">
                  <div className="h-4 w-5/6 max-w-[200px] bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="pr-6 text-right py-4">
                  <div className="h-4 w-16 bg-white/5 rounded ml-auto animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <div className="h-4 w-64 bg-white/5 rounded-md animate-pulse"></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 text-xs opacity-50" disabled>
              <ChevronLeft className="w-3 h-3 mr-1" /> Rev
            </Button>
            <div className="flex items-center justify-center px-4 font-mono text-xs border-x border-border/50 text-white/50 animate-pulse">
              SEQ - / -
            </div>
            <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 text-xs opacity-50" disabled>
              Fwd <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
