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
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <Sidebar userRole={session?.user?.role} />
      <MobileNav userRole={session?.user?.role} />
      <main className="flex-1 w-full md:ml-64 relative min-h-screen animate-fade-in-up md:p-0">
        {children}
      </main>
    </div>
  )
}
