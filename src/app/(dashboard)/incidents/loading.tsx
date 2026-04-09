import { ShieldAlert, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default function IncidentsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 text-primary/30 h-8 w-8 animate-pulse" /> 
            <div className="h-8 w-48 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="h-4 w-96 bg-white/5 rounded-md mt-3 animate-pulse"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-24 bg-white/10 rounded-md animate-pulse"></div>
          <div className="h-10 w-40 bg-primary/20 rounded-md animate-pulse"></div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground/30 mr-2" />
        <div className="flex flex-1 gap-4 items-end flex-wrap">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-9 w-[150px] bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-9 w-[150px] bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-[120px] bg-primary/10 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <Table className="table-fixed">
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary/50 pl-6 w-[12%]">Key</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[25%] lg:w-[30%]">Title</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[10%]">Severity</TableHead>
              <TableHead className="font-semibold text-primary/50 w-[12%]">Status</TableHead>
              <TableHead className="font-semibold text-primary/50 hidden xl:table-cell w-[10%]">Reporter</TableHead>
              <TableHead className="font-semibold text-primary/50 border-r border-border/20 w-[16%]">Assignee</TableHead>
              <TableHead className="font-semibold text-primary/50 border-r border-border/20 hidden xl:table-cell w-[10%]">Target SLA</TableHead>
              <TableHead className="font-semibold text-primary/50 text-right pr-6 w-[10%]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i} className="border-border/50">
                <TableCell className="pl-6">
                  <div className="h-4 w-16 bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-col gap-2 justify-center min-h-[64px]">
                    <div className="h-4 w-3/4 max-w-[200px] xl:max-w-[300px] bg-white/10 rounded animate-pulse"></div>
                    <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse"></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse"></div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="border-r border-border/20">
                  <div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="border-r border-border/20 hidden xl:table-cell">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse"></div>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse ml-auto"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 opacity-50" disabled>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <div className="flex items-center justify-center px-4 font-mono text-sm border-x border-border/50 text-white/50 animate-pulse">
              Pg - / -
            </div>
            <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 opacity-50" disabled>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
