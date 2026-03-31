"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"

interface ChartData {
  severity: string;
  count: number;
}

export function DashboardCharts({ data }: { data: ChartData[] }) {
  // Map severities to gradients logically
  const colorMap: any = {
    CRITICAL: "url(#colorCritical)", 
    HIGH: "url(#colorHigh)", 
    MEDIUM: "url(#colorMedium)", 
    LOW: "url(#colorLow)", 
  }

  const mappedData = data.map(d => ({
    ...d,
    fill: colorMap[d.severity] || "#8884d8"
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-white/10 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] backdrop-blur-xl">
          <p className="text-white/50 text-[10px] font-bold mb-1 tracking-[0.2em] uppercase">{label}</p>
          <p className="text-white font-black text-3xl flex items-center">
             <span className="w-2.5 h-2.5 rounded-full mr-3 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: payload[0].payload.fill.includes('Critical') ? '#ef4444' : payload[0].payload.fill.includes('High') ? '#f97316' : payload[0].payload.fill.includes('Medium') ? '#eab308' : '#10b981', color: payload[0].payload.fill.includes('Critical') ? '#ef4444' : payload[0].payload.fill.includes('High') ? '#f97316' : payload[0].payload.fill.includes('Medium') ? '#eab308' : '#10b981' }} />
             {payload[0].value} <span className="text-xs font-medium text-white/30 ml-2 tracking-wide uppercase">Active</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={mappedData}
          margin={{ top: 20, right: 20, left: -20, bottom: 10 }}
        >
          <defs>
            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={1}/>
              <stop offset="95%" stopColor="#7f1d1d" stopOpacity={0.6}/>
            </linearGradient>
            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={1}/>
              <stop offset="95%" stopColor="#7c2d12" stopOpacity={0.6}/>
            </linearGradient>
            <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={1}/>
              <stop offset="95%" stopColor="#713f12" stopOpacity={0.6}/>
            </linearGradient>
            <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
              <stop offset="95%" stopColor="#064e3b" stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
             dataKey="severity" 
             stroke="#a1a1aa" 
             tickLine={false} 
             axisLine={false} 
             tick={{ fontSize: 11, fontWeight: 700, fill: '#a1a1aa', letterSpacing: '1px' }}
             dy={15}
          />
          <YAxis 
             stroke="#52525b" 
             tickLine={false} 
             axisLine={false}
             tick={{ fontSize: 11, fill: '#71717a' }}
             allowDecimals={false}
             dx={-10}
          />
          <Tooltip 
             cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
             content={<CustomTooltip />}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={45} animationDuration={1500} animationEasing="ease-out">
            {mappedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
