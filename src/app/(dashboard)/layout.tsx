import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BrowserNotifier } from "@/components/browser-notifier"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const userConfig = await db.user.findUnique({
    where: { id: session.user.id },
    select: { browserNotificationsEnabled: true }
  })
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrowserNotifier isEnabled={userConfig?.browserNotificationsEnabled || false} />
      <div className="block md:hidden">
        <MobileNav userRoles={session?.user?.roles} />
      </div>
      <div className="flex flex-col md:flex-row">
        <Sidebar userRoles={session?.user?.roles} />
        <main className="flex-1 w-full md:ml-64 relative min-h-screen animate-fade-in-up md:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
