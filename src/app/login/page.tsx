import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            OpenTicket
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Cybersecurity Incident & Inventory Management
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
