import { Sidebar } from "@/components/layout/Sidebar"
import { auth } from "@/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar userRole={session?.user?.role} />
      <div className="flex-1 md:ml-64 relative min-h-screen animate-fade-in-up">
        {children}
      </div>
    </div>
  )
}
