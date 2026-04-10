"use client"
import { useEffect, useState } from "react"

export function HeightLogger() {
  const [h, setH] = useState("calculating...")
  useEffect(() => {
    let measured = false;
    const interval = setInterval(() => {
       const grid = document.querySelector('.grid.gap-6');
       if (grid && !measured) {
         setH(`Grid Height: ${grid.getBoundingClientRect().height}px | IsForm: ${!!document.querySelector('form')} | IsOuter: ${document.querySelector('.glass-card')?.getBoundingClientRect().height}`)
       }
    }, 500)
    return () => clearInterval(interval);
  }, [])
  return <div id="height-banner" className="fixed top-0 left-0 bg-red-500 text-white z-50 text-xl font-bold p-2 shadow-xl whitespace-nowrap">{h}</div>
}
