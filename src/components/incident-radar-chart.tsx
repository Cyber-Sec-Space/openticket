"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface IncidentRadarData {
  type: string;
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  total: number;
}

export function IncidentRadarChart({ data }: { data: IncidentRadarData[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] backdrop-blur-xl min-w-[180px]">
          <p className="text-white/50 text-[10px] font-bold mb-3 tracking-[0.2em] uppercase">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm font-bold">
                <div className="flex items-center">
                  <span 
                    className="w-2.5 h-2.5 rounded-full mr-3" 
                    style={{ backgroundColor: entry.color || '#0ea5e9', boxShadow: `0 0 10px ${entry.color || '#0ea5e9'}` }} 
                  />
                  <span className="text-white/80">{entry.name}</span>
                </div>
                <span className="text-lg font-black" style={{ color: entry.color || '#0ea5e9' }}>
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <defs>
             <filter id="radarGlowInc" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="6" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis 
             dataKey="type" 
             tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' }} 
          />
          <PolarRadiusAxis 
             angle={30} 
             domain={[0, 'auto']} 
             tick={false} 
             axisLine={false} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
             wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} 
             iconType="circle" 
          />
          
          <Radar 
            name="Total Active" 
            dataKey="total" 
            stroke="#0ea5e9" 
            strokeWidth={3} 
            fill="#0ea5e9" 
            fillOpacity={0.4} 
            filter="url(#radarGlowInc)" 
            animationDuration={2000}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
