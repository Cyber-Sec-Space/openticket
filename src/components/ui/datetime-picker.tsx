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
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ""} />}
      
      <div className="flex items-center w-full !h-10 rounded-md border border-white/10 bg-black/50 focus-within:ring-2 focus-within:ring-primary focus-within:bg-black/80 shadow-inner transition-colors">
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 h-full border-0 bg-transparent font-mono text-sm shadow-none outline-none focus:ring-0 px-3 text-white"
        />

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger
            className="flex h-10 w-10 items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 rounded-r-md transition-all outline-none"
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-black/95 border-border/80 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-xl overflow-hidden" align="end" sideOffset={8}>
          <div className="flex flex-col">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              className="bg-transparent text-white p-3 w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full"
            />
            
            <div className="border-t border-white/10 bg-white/[0.02] p-3 flex flex-col gap-3">
               <div className="flex items-center justify-between px-1">
                  <div className="flex items-center text-xs text-muted-foreground font-medium uppercase tracking-widest gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Time
                  </div>
                  <input
                    type="time"
                    value={date ? format(date, "HH:mm") : ""}
                    onChange={handleTimeChange}
                    className="w-24 h-8 px-2 text-sm text-center outline-none bg-black/50 border border-white/10 rounded-md focus:border-primary/50 focus:ring-1 focus:ring-primary transition-all text-white [color-scheme:dark]"
                  />
               </div>
               
               {date && (
                  <Button 
                     variant="ghost" 
                     className="w-full h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                     onClick={(e) => {
                        e.preventDefault()
                        setDate(undefined)
                        setInputValue("")
                        setIsPopoverOpen(false)
                     }}
                  >
                     <X className="w-3.5 h-3.5 mr-1" /> Clear DateTime
                  </Button>
               )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </div>
  )
}
