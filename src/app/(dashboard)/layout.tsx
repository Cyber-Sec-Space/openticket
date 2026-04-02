import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="block md:hidden">
        <MobileNav userRole={session?.user?.role} />
      </div>
      <div className="flex flex-col md:flex-row">
        <Sidebar userRole={session?.user?.role} />
        <main className="flex-1 w-full md:ml-64 relative min-h-screen animate-fade-in-up md:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
