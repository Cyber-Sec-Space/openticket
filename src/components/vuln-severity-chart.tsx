"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

interface SeverityData {
  severity: string;
  count: number;
}

export function VulnSeverityChart({ data }: { data: SeverityData[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-indigo-500/20 p-4 rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] backdrop-blur-xl">
          <p className="text-indigo-400 text-[10px] font-bold mb-1 tracking-[0.2em] uppercase">{label} VULNERABILITIES</p>
          <p className="text-white font-black text-3xl flex items-center">
             <span className="w-2.5 h-2.5 rounded-full mr-3 shadow-[0_0_10px_#818cf8] bg-indigo-400 text-indigo-400" />
             {payload[0].value} <span className="text-xs font-medium text-white/30 ml-2 tracking-wide uppercase">Active Nodes</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <defs>
             <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="6" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis 
             dataKey="severity" 
             tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 700, letterSpacing: '1px' }} 
          />
          <PolarRadiusAxis 
             angle={30} 
             domain={[0, 'auto']} 
             tick={false} 
             axisLine={false} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Severity"
            dataKey="count"
            stroke="#818cf8"
            strokeWidth={3}
            fill="#4f46e5"
            fillOpacity={0.4}
            filter="url(#radarGlow)"
            animationDuration={2000}
            animationEasing="ease-in-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
