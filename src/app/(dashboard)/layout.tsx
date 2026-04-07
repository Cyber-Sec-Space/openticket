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
        <MobileNav userPermissions={session?.user?.permissions as string[]} />
      </div>
      <div className="flex w-full min-h-screen">
        <Sidebar userPermissions={session?.user?.permissions as string[]} />
        <main className="flex-1 w-full min-w-0 md:pl-64 flex flex-col relative animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  )
}
