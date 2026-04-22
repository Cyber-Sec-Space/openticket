"use client"

export function LocalTime({ date, format = "datetime", className }: { date: Date | string, format?: "datetime" | "date", className?: string }) {
  if (!date) return null;
  const d = new Date(date);
  
  // suppressHydrationWarning prevents Next.js from throwing errors when the server's 
  // timezone rendering inevitably mismatches the client's local browser timezone.
  return (
    <span suppressHydrationWarning className={className}>
      {format === "date" ? d.toLocaleDateString() : d.toLocaleString()}
    </span>
  )
}
