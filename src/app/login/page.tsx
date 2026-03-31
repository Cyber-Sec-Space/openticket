import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-background">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="flex w-full items-center justify-center p-4 relative z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              OpenTicket
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cybersecurity Incident & Asset Operations
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
