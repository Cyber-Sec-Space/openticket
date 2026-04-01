import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { UserCog, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserTableClient } from "./user-table-client"

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
        <div>
          <Link href="/users/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Provision Identity
            </Button>
          </Link>
        </div>
      </div>

      <UserTableClient users={users} sessionUserId={session.user.id} />
    </div>
  )
}
