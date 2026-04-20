"use client";
import React, { forwardRef, useState } from "react";
import { format, parse, isValid } from "date-fns";
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

export const DateTimePicker = forwardRef<HTMLDivElement, DateTimePickerProps>(
  ({ className, name, defaultValue, disabled }, ref) => {
    // Initial parse
    const initialDate = defaultValue ? new Date(defaultValue) : undefined;
    const isValidInit = initialDate && !isNaN(initialDate.getTime());

    const [date, setDate] = useState<Date | undefined>(isValidInit ? initialDate : undefined);
    
    // The textual representation the user interacts with
    const [inputValue, setInputValue] = useState<string>(
      isValidInit ? format(initialDate, "yyyy-MM-dd HH:mm") : ""
    );

    const [timeString, setTimeString] = useState<string>(
      isValidInit ? format(initialDate, "HH:mm") : "00:00"
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      // Try to parse basic format "yyyy-MM-dd HH:mm"
      const parsed = parse(val, "yyyy-MM-dd HH:mm", new Date());
      if (isValid(parsed)) {
        setDate(parsed);
        setTimeString(format(parsed, "HH:mm"));
      } else {
        // Fallback for just dates "yyyy-MM-dd"
        const parsedDate = parse(val, "yyyy-MM-dd", new Date());
        if (isValid(parsedDate)) {
           const [hours, minutes] = timeString.split(":");
           parsedDate.setHours(parseInt(hours || "0", 10));
           parsedDate.setMinutes(parseInt(minutes || "0", 10));
           setDate(parsedDate);
        } else {
           setDate(undefined);
        }
      }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
      if (selectedDate) {
        const [hours, minutes] = timeString.split(":");
        selectedDate.setHours(parseInt(hours || "0", 10));
        selectedDate.setMinutes(parseInt(minutes || "0", 10));
        setDate(selectedDate);
        setInputValue(format(selectedDate, "yyyy-MM-dd HH:mm"));
      } else {
        setDate(undefined);
        setInputValue("");
      }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTimeString(val);
      if (date && val) {
        const [hours, minutes] = val.split(":");
        const newDate = new Date(date);
        newDate.setHours(parseInt(hours || "0", 10));
        newDate.setMinutes(parseInt(minutes || "0", 10));
        setDate(newDate);
        setInputValue(format(newDate, "yyyy-MM-dd HH:mm"));
      }
    };

    return (
      <div className={cn("relative flex items-center w-full group", className)} ref={ref}>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="YYYY-MM-DD HH:mm"
          className="w-full bg-black/40 border-white/10 text-white focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm h-10 pr-12"
          disabled={disabled}
        />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-white/5 disabled:opacity-50"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-black/95 border border-white/10 shadow-[0_0_30px_rgba(0,255,200,0.15)] backdrop-blur-xl rounded-xl overflow-hidden glass-panel" align="end">
            <div className="bg-gradient-to-b from-white/5 to-transparent">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                className="bg-transparent"
              />
              <div className="p-3 border-t border-white/10 flex items-center justify-between gap-3 bg-black/50">
                <div className="flex items-center gap-2 text-primary/80">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Time</span>
                </div>
                <Input 
                  type="time" 
                  value={timeString}
                  onChange={handleTimeChange}
                  className="bg-black/60 border-white/10 text-white h-8 w-[120px] focus:ring-primary focus:border-primary font-mono text-sm [color-scheme:dark]"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {/* Hidden field for form data */}
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
