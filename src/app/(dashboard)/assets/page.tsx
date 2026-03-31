import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Server, Plus } from "lucide-react"

export default async function AssetsPage() {
  const session = await auth()
  if (!session?.user) return null

  const assets = await db.asset.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
       <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Server className="mr-3 text-blue-400 h-8 w-8" /> Assets Inventory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Review real-time telemetry and catalog metadata for enterprise systems.</p>
        </div>
        
        {session.user.role !== 'REPORTER' && (
          <Link href="/assets/new">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Add Asset
            </Button>
          </Link>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary">Asset Name</TableHead>
              <TableHead className="font-semibold text-primary">Type</TableHead>
              <TableHead className="font-semibold text-primary">IP Address</TableHead>
              <TableHead className="font-semibold text-primary">Status</TableHead>
              <TableHead className="font-semibold text-primary text-right">Cataloged On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  Empty IT Asset catalog.
                </TableCell>
              </TableRow>
            ) : assets.map(asset => (
              <TableRow 
                key={asset.id} 
                className="hover:bg-primary/5 border-border transition-colors cursor-pointer"
              >
                <TableCell className="font-medium text-foreground">
                  {asset.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{asset.type}</TableCell>
                <TableCell className="font-mono text-sm text-blue-400">{asset.ipAddress || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={`bg-transparent border ${asset.status === 'COMPROMISED' ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(255,150,0,0.2)] animate-pulse' : (asset.status === 'ACTIVE' ? 'border-primary text-primary' : 'border-muted-foreground text-muted-foreground')}`}>
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{asset.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
