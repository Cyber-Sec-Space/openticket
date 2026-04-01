import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import { auth } from "@/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar userRole={session?.user?.role} />
      <MobileNav userRole={session?.user?.role} />
      <main className="w-full md:pl-64 min-h-screen flex flex-col relative animate-fade-in-up">
        <div className="flex-1 w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
