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
      <main className="md:pl-64 relative min-h-screen animate-fade-in-up w-full flex flex-col">
        <div className="flex-1 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
