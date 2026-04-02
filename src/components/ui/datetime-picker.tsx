"use client"

import * as React from "react"
import { format } from "date-fns"
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
  placeholder = "Select Target SLA..."
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(defaultValue)
  const [selectedTime, setSelectedTime] = React.useState<string>(
    defaultValue ? format(defaultValue, "HH:mm") : "12:00"
  )

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return
    const [h, m] = selectedTime.split(":").map(Number)
    d.setHours(h || 0, m || 0, 0, 0)
    setDate(d)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value
    setSelectedTime(timeVal)
    if (date) {
      const [h, m] = timeVal.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(h || 0, m || 0, 0, 0)
      setDate(newDate)
    }
  }

  return (
    <div className="relative w-full">
      {name && <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ""} />}
      <Popover>
        <PopoverTrigger
          className={cn(
            "flex items-center !h-10 w-full justify-start text-left font-normal rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary transition-all pr-8 hover:bg-black/70 hover:text-white",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary/70" />
          <span className="truncate flex-1">
            {date ? format(date, "PPP, HH:mm") : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-black/95 border-border/60 shadow-2xl backdrop-blur-md" align="start">
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
                  value={selectedTime}
                  onChange={handleTimeChange}
                  className="w-32 h-8 text-sm outline-none bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-primary transition-all [color-scheme:dark]"
                />
             </div>
             <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                   e.preventDefault()
                   setDate(undefined)
                }}
             >
                <X className="w-3 h-3 mr-1" /> Clear Date
             </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
