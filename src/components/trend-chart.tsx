"use client"

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface TrendData {
  date: string;
  incidents: number;
  vulnerabilities: number;
}

export function TrendChart({ data }: { data: TrendData[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] backdrop-blur-xl">
          <p className="text-white/50 text-[10px] font-bold mb-2 tracking-[0.2em] uppercase">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center text-sm font-bold mb-1">
              <span 
                className="w-2.5 h-2.5 rounded-full mr-3" 
                style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }} 
              />
              <span className="text-white w-24">{entry.name}</span>
              <span className="text-white text-lg font-black" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorVulns" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#a1a1aa" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fontWeight: 700, fill: '#a1a1aa', letterSpacing: '0.5px' }}
            dy={10}
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
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, fill: 'transparent' }} 
            content={<CustomTooltip />}
          />
          <Legend 
             wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
             iconType="circle" 
             verticalAlign="top" 
             align="right"
          />
          <Area 
            name="Active Incidents"
            type="monotone" 
            dataKey="incidents" 
            stroke="#ef4444" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorIncidents)" 
            animationDuration={2000}
          />
          <Area 
            name="Vulnerabilities"
            type="monotone" 
            dataKey="vulnerabilities" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorVulns)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
