"use client"

import * as React from "react"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/dark.css"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  defaultValue?: Date
  name?: string
  className?: string
  placeholder?: string
}

export function DateTimePicker({
  defaultValue,
  name,
  className,
  placeholder = "yyyy-MM-dd HH:mm"
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(defaultValue)
  const fpRef = React.useRef<any>(null)

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ""} />}

      <div className="flex items-center w-full !h-10 rounded-md border border-white/10 bg-black/50 focus-within:ring-2 focus-within:ring-primary focus-within:bg-black/80 shadow-inner transition-colors">
        <Flatpickr
          ref={fpRef}
          data-enable-time
          options={{
            enableTime: true,
            time_24hr: true,
            dateFormat: "Y-m-d H:i",
            defaultDate: defaultValue,
            allowInput: true,
            disableMobile: true, // ensures same UI on all devices
          }}
          value={date}
          onChange={([selectedDate]) => {
            setDate(selectedDate || undefined)
          }}
          placeholder={placeholder}
          className="flex-1 h-full border-0 bg-transparent font-mono text-sm shadow-none outline-none focus:ring-0 px-3 text-white placeholder:text-muted-foreground"
        />

        {date && (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all outline-none"
            onClick={(e) => {
              e.preventDefault()
              setDate(undefined)
              if (fpRef.current?.flatpickr) {
                fpRef.current.flatpickr.clear()
              }
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (fpRef.current?.flatpickr) {
              fpRef.current.flatpickr.toggle()
            }
          }}
          className="flex h-10 w-10 items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 rounded-r-md transition-all outline-none border-l border-white/5"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      <style jsx global>{`
        .flatpickr-calendar {
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(16px);
          font-family: inherit;
        }
        .flatpickr-time {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .flatpickr-day.selected {
          background: hsl(var(--primary)) !important;
          border-color: hsl(var(--primary)) !important;
        }
      `}</style>
    </div>
  )
}
