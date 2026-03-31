"use client"

import { useRouter } from "next/navigation"
import { TableRow } from "@/components/ui/table"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ClickableTableRowProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ClickableTableRow({ href, children, className }: ClickableTableRowProps) {
  const router = useRouter()
  
  return (
    <TableRow 
      onClick={() => router.push(href)}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </TableRow>
  )
}
