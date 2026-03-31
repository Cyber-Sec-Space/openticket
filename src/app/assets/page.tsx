import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function AssetsPage() {
  const session = await auth()
  if (!session?.user) return null

  const assets = await db.asset.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage and track your IT assets.</p>
        </div>
        {session.user.role !== 'REPORTER' && (
          <Link href="/assets/new">
            <Button>Add Asset</Button>
          </Link>
        )}
      </div>

      <div className="border rounded-md shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cataloged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No assets found.
                </TableCell>
              </TableRow>
            ) : assets.map(asset => (
              <TableRow key={asset.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  {asset.name}
                </TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell>{asset.ipAddress || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={asset.status === 'COMPROMISED' ? 'destructive' : (asset.status === 'ACTIVE' ? 'default' : 'secondary')}>
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell>{asset.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Link href="/">
          <Button variant="ghost">← Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
