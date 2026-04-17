"use client"

import { useEffect, useState } from "react"
import { Upload } from "lucide-react"

export function FileUploadBox({ resetKey }: { resetKey?: number }) {
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    setFileName(null)
  }, [resetKey])

  return (
    <div className="relative group rounded-lg border-2 border-dashed border-indigo-500/20 hover:border-indigo-400/50 hover:bg-indigo-500/5 bg-black/20 transition-all flex flex-col items-center justify-center p-4">
      <input 
        type="file" 
        name="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 text-transparent file:text-transparent" 
        required 
        title={fileName || "Upload an evidence file"} // Using 'title' prevents the default "No file chosen" browser tooltip in some contexts, or we can just leave it. The opacity trick is standard.
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name)
          } else {
            setFileName(null)
          }
        }}
      />
      
      {fileName ? (
        <div className="flex flex-col items-center text-center space-y-2 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Upload className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs font-semibold text-indigo-300 truncate max-w-[200px]">{fileName}</p>
          <span className="text-[10px] text-muted-foreground/50 italic">Click to change file</span>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <Upload className="w-6 h-6 text-indigo-400/50 group-hover:text-indigo-400 mb-2 transition-colors" />
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-indigo-300">Click or drag file here</span>
        </div>
      )}
    </div>
  )
}
