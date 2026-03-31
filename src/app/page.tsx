import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    return null // Handled by middleware redirect
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-800 shadow rounded-lg p-6 space-y-6">
        <header className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              OpenTicket Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back, {session.user.name || session.user.email} (Role: {session.user.role})
            </p>
          </div>
          <form action={async () => {
            "use server"
            await signOut()
          }}>
            <Button variant="outline" type="submit">Sign Out</Button>
          </form>
        </header>
        
        <main className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/incidents" className="block p-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-200 dark:border-slate-600">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Incidents</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Manage and track security incidents.</p>
          </Link>
          <Link href="/assets" className="block p-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-200 dark:border-slate-600">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assets</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Inventory management and tracking.</p>
          </Link>
        </main>
      </div>
    </div>
  )
}
