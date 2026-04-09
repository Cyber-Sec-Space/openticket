import { ToyBrick } from "lucide-react"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border bg-black/20 border-white/5 flex flex-col justify-between h-full animate-pulse gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <ToyBrick className="w-8 h-8 text-white/5" />
                <div className="w-10 h-4 bg-white/5 rounded-full" />
              </div>
              <div className="space-y-3 mt-1">
                <div className="flex flex-col gap-2">
                  <div className="w-2/3 h-5 bg-white/10 rounded" />
                  <div className="w-24 h-4 bg-white/5 rounded-full mt-1" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-3.5 bg-white/5 rounded" />
                  <div className="w-11/12 h-3.5 bg-white/5 rounded" />
                  <div className="w-4/5 h-3.5 bg-white/5 rounded" />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end">
              <div className="w-24 h-8 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
