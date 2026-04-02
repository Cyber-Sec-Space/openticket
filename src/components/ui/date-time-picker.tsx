"use client";
import React, { useState, forwardRef, useEffect } from "react";
import DatePicker, { DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { CalendarIcon } from "lucide-react";

export interface DateTimePickerProps extends Omit<DatePickerProps, "onChange"> {
  className?: string;
  name?: string;
  defaultValue?: string | Date | null;
}

export const DateTimePicker = forwardRef<any, DateTimePickerProps>(
  ({ className, name, defaultValue, ...props }, ref) => {
    const [date, setDate] = useState<Date | null>(
      defaultValue ? new Date(defaultValue) : null
    );

    return (
      <div className={cn("relative w-full", className)}>
        {name && (
          <input 
            type="hidden" 
            name={name} 
            value={date ? date.toISOString() : ""} 
          />
        )}
        <DatePicker
          selected={date}
          onChange={(newDate: Date | null) => setDate(newDate)}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="yyyy/MM/dd HH:mm"
          portalId="calendar-portal"
          showPopperArrow={false}
          customInput={
            <div className="relative w-full">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input 
                 className="pl-9 !h-10 text-white bg-black/50 border-white/10" 
                 ref={ref as any}
                 placeholder="YYYY/MM/DD HH:mm"
                 autoComplete="off"
              />
            </div>
          }
          wrapperClassName="w-full"
          {...props as any}
        />
        {/* Inject dark theme styles globally or scoped */}
        <style dangerouslySetInnerHTML={{__html: `
          .react-datepicker-wrapper { width: 100%; display: block; }
          .react-datepicker-popper { z-index: 9999; }
          .react-datepicker { font-family: inherit; background-color: #09090b; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: #fff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
          .react-datepicker__header { background-color: #09090b; border-bottom: 1px solid rgba(255,255,255,0.1); padding-top: 12px; border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
          .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header { color: #fff; font-weight: 600; font-size: 0.9rem; }
          .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name { color: #a1a1aa; width: 2rem; line-height: 2rem; margin: 0.2rem; }
          .react-datepicker__day:hover, .react-datepicker__month-text:hover, .react-datepicker__quarter-text:hover, .react-datepicker__year-text:hover { background-color: rgba(255,255,255,0.1); border-radius: 0.3rem; }
          .react-datepicker__day--selected, .react-datepicker__day--in-selecting-range, .react-datepicker__day--in-range, .react-datepicker__month-text--selected, .react-datepicker__month-text--in-selecting-range, .react-datepicker__month-text--in-range, .react-datepicker__quarter-text--selected, .react-datepicker__quarter-text--in-selecting-range, .react-datepicker__quarter-text--in-range, .react-datepicker__year-text--selected, .react-datepicker__year-text--in-selecting-range, .react-datepicker__year-text--in-range { background-color: #3b82f6; color: #fff; border-radius: 0.3rem; font-weight: bold; }
          .react-datepicker__time-container { border-left: 1px solid rgba(255,255,255,0.1); width: 100px; }
          .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item { height: auto; padding: 8px 10px; color: #a1a1aa; display: flex; align-items: center; justify-content: center; }
          .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover { background-color: rgba(255,255,255,0.1); color: white; }
          .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected { background-color: #3b82f6 !important; color: #fff; font-weight: bold; }
          .react-datepicker__time-container .react-datepicker__time { background-color: #09090b; border-radius: 0.5rem; }
          .react-datepicker-popper[data-placement^=bottom] .react-datepicker__triangle::before, .react-datepicker-popper[data-placement^=bottom] .react-datepicker__triangle::after { border-bottom-color: #09090b; }
          .react-datepicker-popper[data-placement^=top] .react-datepicker__triangle::before, .react-datepicker-popper[data-placement^=top] .react-datepicker__triangle::after { border-top-color: #09090b; }
          .react-datepicker__navigation-icon::before { border-color: #a1a1aa; border-width: 2px 2px 0 0; }
          .react-datepicker__navigation:hover *::before { border-color: #fff; }
        `}} />
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";
