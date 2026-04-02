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
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 h-full border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 px-3"
        />

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger
            className="flex h-10 w-10 items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 rounded-r-md transition-all outline-none"
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-black/95 border-border/60 shadow-2xl backdrop-blur-md" align="end" sideOffset={8}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="bg-transparent text-white"
          />
          <div className="p-3 border-t border-white/10 bg-white/5 flex flex-col gap-3">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center text-xs text-muted-foreground font-medium uppercase tracking-widest gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Time
                </div>
                <Input
                  type="time"
                  value={date ? format(date, "HH:mm") : ""}
                  onChange={handleTimeChange}
                  className="w-32 h-8 text-sm outline-none bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-primary transition-all [color-scheme:dark]"
                />
             </div>
             {date && (
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  )
}
