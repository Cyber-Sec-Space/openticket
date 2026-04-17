"use client";
import React, { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface DateTimePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'defaultValue'> {
  defaultValue?: string | Date | null;
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ className, name, defaultValue, onChange, disabled, ...props }, ref) => {
    // Safely parse initial value into local timezone YYYY-MM-DDThh:mm format
    let initVal = "";
    if (defaultValue) {
      try {
        const d = new Date(defaultValue);
        if (!isNaN(d.getTime())) {
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - (offset * 60 * 1000));
          initVal = localDate.toISOString().slice(0, 16);
        }
      } catch (e) {
        // Fallback to empty if parse fails
      }
    }

    const [val, setVal] = useState(initVal);

    return (
      <div className={cn("relative w-full", className)}>
        <Input 
          type="datetime-local"
          className={cn("w-full bg-black/50 border-white/10 text-white !h-10 px-3 custom-datetime-picker", className)}
          ref={ref}
          value={val}
          disabled={disabled}
          onChange={(e) => {
             setVal(e.target.value);
             if (onChange) onChange(e);
          }}
          {...props}
        />
        {/* Hidden field to maintain exact ISO-8601 UTC data contract for FormData Server Actions */}
        {name && (
          <input 
            type="hidden" 
            name={name} 
            value={val ? new Date(val).toISOString() : ""} 
          />
        )}
        <style dangerouslySetInnerHTML={{__html: `
          /* Ensure native calendar icons invert to white on dark mode */
          .custom-datetime-picker::-webkit-calendar-picker-indicator {
             filter: invert(1);
             opacity: 0.5;
             cursor: pointer;
          }
          .custom-datetime-picker::-webkit-calendar-picker-indicator:hover {
             opacity: 1;
          }
        `}} />
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";
