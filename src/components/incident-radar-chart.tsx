"use client"

import {
  PieChart,
  Pie,
  Cell,
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
  INFO: number;
  total: number;
}

const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#facc15', // yellow-400
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#64748b'  // slate-500
];

export function IncidentRadarChart({ data }: { data: IncidentRadarData[] }) {
  // Filter out types with no current incidents
  const activeData = data.filter(d => d.total > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-black/95 border border-white/10 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] backdrop-blur-xl min-w-[200px]">
          <h3 className="text-white font-bold mb-3 tracking-widest uppercase text-xs border-b border-white/10 pb-2">
            {dataPoint.type}
          </h3>
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-1">
            <span>TOTAL ACTIVE</span>
            <span className="text-sm font-black text-white">{dataPoint.total}</span>
          </div>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-red-500/70 font-semibold">Critical</span>
              <span className="text-red-400 font-bold">{dataPoint.CRITICAL}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-orange-500/70 font-semibold">High</span>
              <span className="text-orange-400 font-bold">{dataPoint.HIGH}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-yellow-500/70 font-semibold">Medium</span>
              <span className="text-yellow-400 font-bold">{dataPoint.MEDIUM}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-cyan-500/70 font-semibold">Info</span>
              <span className="text-cyan-400 font-bold">{dataPoint.INFO}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (activeData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <p className="text-white/40 font-mono text-sm tracking-widest uppercase">No Active Incidents Found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 relative">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <defs>
            <filter id="pieGlow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="3" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
             verticalAlign="bottom"
             height={36}
             iconType="circle"
             wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em' }}
          />
          <Pie
            data={activeData}
            cx="50%"
            cy="45%"
            innerRadius="50%"
            outerRadius="80%"
            dataKey="total"
            nameKey="type"
            paddingAngle={3}
            strokeWidth={0}
            animationDuration={1500}
            animationBegin={200}
          >
            {activeData.map((entry, index) => (
              <Cell 
                 key={`cell-${index}`} 
                 fill={COLORS[index % COLORS.length]} 
                 filter="url(#pieGlow)"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
