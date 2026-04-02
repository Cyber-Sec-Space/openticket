"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon, Clock, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

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
  const [inputValue, setInputValue] = React.useState<string>(
    defaultValue ? format(defaultValue, "yyyy-MM-dd HH:mm") : ""
  )
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

  // Sync typed value back to internal Date state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    
    if (!val) {
      setDate(undefined)
      return
    }

    const parsed = parse(val, "yyyy-MM-dd HH:mm", new Date())
    if (isValid(parsed) && val.length === 16) {
      setDate(parsed)
    }
  }

  // When Calendar is clicked
  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return
    // preserve time if it was already typed/selected
    let h = 12, m = 0
    if (date) {
      h = date.getHours()
      m = date.getMinutes()
    } else if (inputValue.length === 16) {
      const parsed = parse(inputValue, "yyyy-MM-dd HH:mm", new Date())
      if (isValid(parsed)) {
        h = parsed.getHours()
        m = parsed.getMinutes()
      }
    }
    d.setHours(h, m, 0, 0)
    setDate(d)
    setInputValue(format(d, "yyyy-MM-dd HH:mm"))
  }

  // When Time Input is changed
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value
    if (date) {
      const [h, m] = timeVal.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(h || 0, m || 0, 0, 0)
      setDate(newDate)
      setInputValue(format(newDate, "yyyy-MM-dd HH:mm"))
    } else {
      // if no date selected yet but they change time, default to today
      const [h, m] = timeVal.split(":").map(Number)
      const newDate = new Date()
      newDate.setHours(h || 0, m || 0, 0, 0)
      setDate(newDate)
      setInputValue(format(newDate, "yyyy-MM-dd HH:mm"))
    }
  }

  return (
    <div className={cn("relative w-full flex items-center group/picker", className)}>
      {name && <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ""} />}
      
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className="!h-10 pr-10 bg-black/50 border-white/10 focus-visible:ring-primary focus-visible:bg-black/80 font-mono text-sm shadow-inner transition-colors"
      />

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <PopoverTrigger
            className="text-primary/50 hover:text-primary hover:bg-primary/10 h-8 w-8 rounded transition-all flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary"
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0 bg-black/95 border-border/60 shadow-2xl backdrop-blur-md" align="end" sideOffset={8}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="bg-transparent text-white"
          />
          <div className="p-3 border-t border-white/10 bg-black/40 flex flex-col gap-3">
             <div className="flex items-center justify-between gap-4 bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="flex items-center text-[10px] text-muted-foreground font-semibold uppercase tracking-widest gap-2 pl-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400/80" /> Time
                </div>
                <div className="flex items-center gap-1.5 pr-1">
                  <Input
                    type="text"
                    maxLength={2}
                    value={date ? format(date, "HH") : ""}
                    onChange={(e) => {
                       let val = e.target.value.replace(/\D/g, "");
                       if (val && parseInt(val) > 23) val = "23";
                       handleTimeChange({ target: { value: `${val.padStart(2, '0')}:${date ? format(date, "mm") : "00"}` } } as any);
                       if (!date && val) e.target.value = val;
                    }}
                    placeholder="HH"
                    className="w-[42px] h-8 text-center text-sm outline-none bg-black/60 border-white/10 focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all font-mono"
                  />
                  <span className="text-white/30 font-bold">:</span>
                  <Input
                    type="text"
                    maxLength={2}
                    value={date ? format(date, "mm") : ""}
                    onChange={(e) => {
                       let val = e.target.value.replace(/\D/g, "");
                       if (val && parseInt(val) > 59) val = "59";
                       handleTimeChange({ target: { value: `${date ? format(date, "HH") : "12"}:${val.padStart(2, '0')}` } } as any);
                       if (!date && val) e.target.value = val;
                    }}
                    placeholder="MM"
                    className="w-[42px] h-8 text-center text-sm outline-none bg-black/60 border-white/10 focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all font-mono"
                  />
                </div>
             </div>
             {date && (
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md py-1 h-8 opacity-80 hover:opacity-100 transition-opacity"
                   onClick={(e) => {
                      e.preventDefault()
                      setDate(undefined)
                      setInputValue("")
                      setIsPopoverOpen(false)
                   }}
                >
                   <X className="w-3 h-3 mr-1" /> Clear DateTime
                </Button>
             )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
