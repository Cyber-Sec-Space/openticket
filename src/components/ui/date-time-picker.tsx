"use client";
import React, { forwardRef, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface DateTimePickerProps {
  name?: string;
  className?: string;
  defaultValue?: string | Date | null;
  disabled?: boolean;
}

export const DateTimePicker = forwardRef<HTMLButtonElement, DateTimePickerProps>(
  ({ className, name, defaultValue, disabled }, ref) => {
    const [date, setDate] = useState<Date | undefined>(() => {
      if (!defaultValue) return undefined;
      const parsed = new Date(defaultValue);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    });

    const [timeString, setTimeString] = useState<string>(() => {
      if (!defaultValue) return "00:00";
      const parsed = new Date(defaultValue);
      if (isNaN(parsed.getTime())) return "00:00";
      return format(parsed, "HH:mm");
    });

    // Sync time string into the date object
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTimeString(val);
      if (date && val) {
        const [hours, minutes] = val.split(":");
        const newDate = new Date(date);
        newDate.setHours(parseInt(hours || "0", 10));
        newDate.setMinutes(parseInt(minutes || "0", 10));
        setDate(newDate);
      }
    };

    const handleSelect = (selectedData: Date | undefined) => {
      if (selectedData) {
        const [hours, minutes] = timeString.split(":");
        selectedData.setHours(parseInt(hours || "0", 10));
        selectedData.setMinutes(parseInt(minutes || "0", 10));
      }
      setDate(selectedData);
    };

    return (
      <div className={cn("relative w-full", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-black/50 border border-white/10 text-white hover:bg-white/10 hover:text-white transition-all h-10 px-3",
                !date && "text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? format(date, "PPP p") : <span>Pick a date & time</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-black/95 border-white/10 shadow-2xl glass-panel" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
            />
            <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                <span className="text-sm text-muted-foreground">Time</span>
              </div>
              <Input 
                type="time" 
                value={timeString}
                onChange={handleTimeChange}
                className="bg-black/50 border-white/10 text-white h-8 w-[120px] focus:ring-primary focus:border-primary [color-scheme:dark]"
              />
            </div>
          </PopoverContent>
        </Popover>
        {/* Hidden field to maintain exact ISO-8601 UTC data contract for FormData Server Actions */}
        {name && (
          <input 
            type="hidden" 
            name={name} 
            value={date ? date.toISOString() : ""} 
          />
        )}
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";
