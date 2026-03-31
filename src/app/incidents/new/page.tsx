import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createIncident } from "./actions"
import Link from "next/link"

export default async function NewIncidentPage() {
  const session = await auth()
  if (!session?.user) return null

  const assets = await db.asset.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/incidents">
          <Button variant="ghost">← Back</Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Report New Incident</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Note: In a production app with Shadcn UI Form, use react-hook-form. For this MVP we use native HTML forms mapped to next-auth server actions. */}
          <form action={async (formData) => {
            "use server"
            await createIncident({}, formData)
          }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="E.g., Phishing email received" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select 
                id="severity" 
                name="severity" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue="LOW"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetId">Affected Asset (Optional)</Label>
              <select 
                id="assetId" 
                name="assetId" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">None</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.name} ({asset.ipAddress})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Details)</Label>
              <Textarea 
                id="description" 
                name="description" 
                rows={5} 
                placeholder="Describe the incident in detail..." 
                required 
              />
            </div>

            <Button type="submit" className="w-full">Submit Incident</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
