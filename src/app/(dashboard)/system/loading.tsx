import { Sliders, ShieldCheck, UserPlus, Fingerprint, ShieldAlert, Mail } from "lucide-react"

export default function SystemSettingsLoading() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Sliders className="w-8 h-8 mr-3 text-emerald-400/30 animate-pulse" /> 
            <div className="h-9 w-72 bg-white/10 rounded-md animate-pulse"></div>
          </h1>
          <div className="mt-2 h-6 w-96 max-w-full bg-white/5 rounded animate-pulse"></div>
        </div>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <div className="border-b border-white/5 bg-black/20 p-6 flex flex-row items-center space-x-4">
          <ShieldCheck className="w-8 h-8 text-primary/30 animate-pulse" />
          <div className="flex flex-col gap-1 w-full pt-0.5">
            <div className="h-[24px] w-48 bg-white/10 rounded animate-pulse"></div>
            <div className="h-[20px] w-64 bg-white/5 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            <div className="grid gap-6">
              
              {/* Registration Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                <div className="space-y-1 w-full flex flex-col justify-center">
                  <div className="h-[14px] w-48 flex items-center bg-white/10 rounded mb-1 animate-pulse"></div>
                  <div className="w-full pt-1">
                    <div className="h-[12px] w-[60%] bg-white/5 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                <div className="space-y-1 w-full flex flex-col justify-center">
                  <div className="h-[14px] w-64 flex items-center bg-white/10 rounded mb-1 animate-pulse"></div>
                  <div className="w-[85%] pt-1">
                    <div className="h-[12px] w-full bg-white/5 rounded animate-pulse"></div>
                    <div className="h-[12px] w-[20%] bg-white/5 rounded animate-pulse mt-1"></div>
                  </div>
                </div>
              </div>

              {/* Identity Verification Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                <div className="space-y-1 w-full flex flex-col justify-center">
                  <div className="h-[14px] w-52 flex items-center bg-white/10 rounded mb-1 animate-pulse"></div>
                  <div className="w-full pt-1">
                    <div className="h-[12px] w-[85%] bg-white/5 rounded animate-pulse"></div>
                    <div className="h-[12px] w-[40%] bg-white/5 rounded animate-pulse mt-1"></div>
                  </div>
                </div>
              </div>

              {/* System Platform URL */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <div className="h-4 w-40 bg-white/10 rounded animate-pulse mt-0.5"></div>
                <div className="w-full pt-0.5">
                  <div className="h-[12px] w-[80%] bg-white/5 rounded animate-pulse mb-3"></div>
                </div>
                <div className="h-10 w-full bg-white/5 rounded-md animate-pulse flex items-center px-3 gap-2">
                </div>
              </div>

              {/* Default Role Select */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <div className="h-4 w-56 bg-white/10 rounded animate-pulse mt-0.5"></div>
                <div className="w-full">
                  <div className="h-[12px] w-[65%] bg-white/5 rounded mt-0.5 animate-pulse mb-3"></div>
                </div>
                <div className="h-10 w-[280px] bg-white/5 rounded-md animate-pulse"></div>
              </div>

              <hr className="my-2 border-white/5" />

              {/* Rate Limiting Section */}
              <div className="space-y-4 p-5 border border-white/10 rounded-md bg-black/20">
                <h3 className="flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-primary/30 animate-pulse" /> 
                  <div className="h-5 w-72 bg-white/10 rounded animate-pulse"></div>
                </h3>
                
                <div className="flex flex-row items-center space-x-4 mb-4">
                  <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                  <div className="space-y-1 w-full pt-1">
                    <div className="h-[14px] w-56 bg-white/10 rounded mb-1 animate-pulse"></div>
                    <div className="w-full pt-0.5">
                      <div className="h-[12px] w-[70%] bg-white/5 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <div className="h-[12px] w-32 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-[12px] w-48 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-48 bg-white/5 rounded-md animate-pulse"></div>
                    <div className="h-[14px] w-32 bg-white/5 rounded mt-1 animate-pulse"></div>
                  </div>
                </div>
              </div>

              <hr className="my-2 border-white/5" />

              {/* SOAR Automation Section */}
              <div className="space-y-4 p-5 border border-white/10 rounded-md bg-black/20">
                <h3 className="flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-primary/30 animate-pulse" /> 
                  <div className="h-5 w-80 max-w-full bg-white/10 rounded animate-pulse"></div>
                </h3>
                
                <div className="flex flex-row items-center space-x-4 mb-4">
                  <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                  <div className="space-y-1 w-full">
                    <div className="h-[14px] w-80 bg-white/10 rounded mb-1 animate-pulse"></div>
                    <div className="w-5/6 pt-1">
                      <div className="h-[12px] w-[95%] bg-white/5 rounded animate-pulse"></div>
                      <div className="h-[12px] w-[50%] bg-white/5 rounded animate-pulse mt-1"></div>
                    </div>
                  </div>
                </div>

                <div className="ml-8 space-y-2 mt-4">
                  <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
                  <div className="h-10 w-[280px] bg-white/5 rounded-md animate-pulse"></div>
                  <div className="h-[14px] w-[60%] bg-white/5 rounded mt-1 animate-pulse"></div>
                </div>
              </div>

              <hr className="my-2 border-white/5" />
              
              {/* SLA Settings Block */}
              <div className="p-5 border border-white/10 rounded-md bg-black/20">
                 <div className="flex flex-col space-y-3 mb-2">
                    <div className="h-5 w-64 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-4 w-[75%] bg-white/5 rounded animate-pulse mb-2"></div>
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                         <div key={i} className="h-7 w-[110px] bg-black/30 border border-blue-500/30 rounded-md animate-pulse"></div>
                      ))}
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mt-6 border-t border-white/5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-md bg-black/30 border-white/5 space-y-2">
                        <div className="h-4 w-20 bg-white/10 rounded animate-pulse"></div>
                        <div className="flex items-center pt-1">
                          <div className="h-[48px] w-full bg-white/5 rounded-md animate-pulse border border-white/10"></div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              <hr className="my-2 border-white/5" />

              {/* SMTP Settings Block */}
              <div className="space-y-4 p-5 border border-white/10 rounded-md bg-black/20">
                <h3 className="flex items-center mb-4">
                  <Mail className="w-4 h-4 mr-2 text-primary/30 animate-pulse" /> 
                  <div className="h-5 w-56 bg-white/10 rounded animate-pulse"></div>
                </h3>

                <div className="flex flex-row items-center space-x-4 mb-4">
                  <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                  <div className="space-y-1 w-full pt-1">
                    <div className="h-[14px] w-40 bg-white/10 rounded mb-1 animate-pulse"></div>
                    <div className="w-full pt-0.5">
                       <div className="h-[12px] w-[65%] bg-white/5 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                </div>

                <hr className="my-4 border-white/5 mx-4" />
                
                <div className="h-4 w-32 bg-white/10 rounded ml-8 mb-2 animate-pulse"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                   {Array.from({ length: 7 }).map((_, i) => (
                     <div key={i} className="flex items-center space-x-3">
                       <div className="h-4 w-4 shrink-0 bg-white/10 rounded-[4px] animate-pulse border border-input"></div>
                       <div className="h-5 w-64 bg-white/5 rounded animate-pulse"></div>
                     </div>
                   ))}
                </div>
              </div>

            </div>

            <hr className="my-6 border-white/10" />

            <div className="flex justify-end">
               <div className="h-9 w-48 bg-primary/20 rounded-md animate-pulse mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
