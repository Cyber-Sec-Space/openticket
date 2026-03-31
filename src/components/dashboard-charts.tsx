"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface ChartData {
  severity: string;
  count: number;
}

export function DashboardCharts({ data }: { data: ChartData[] }) {
  // Map severities to colors logically
  const colorMap: any = {
    CRITICAL: "#ef4444", // red-500
    HIGH: "#f97316", // orange-500
    MEDIUM: "#eab308", // yellow-500
    LOW: "#10b981", // emerald-500
  }

  const mappedData = data.map(d => ({
    ...d,
    fill: colorMap[d.severity] || "#8884d8"
  }))

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={mappedData}
          margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
          <XAxis 
             dataKey="severity" 
             stroke="#a1a1aa" 
             tickLine={false} 
             axisLine={false} 
             tick={{ fontSize: 12, fontWeight: 600, fill: '#fff' }}
          />
          <YAxis 
             stroke="#a1a1aa" 
             tickLine={false} 
             axisLine={false}
             tick={{ fontSize: 12 }}
             allowDecimals={false}
          />
          <Tooltip 
             cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
             contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                borderColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                color: '#fff'
             }} 
             itemStyle={{ color: '#00e5ff' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
