"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface StatusData {
  status: string;
  count: number;
}

export function VulnStatusChart({ data }: { data: StatusData[] }) {
  const colorMap: any = {
    OPEN: "url(#pieOpen)",
    MITIGATED: "url(#pieMitigated)",
    RESOLVED: "url(#pieResolved)"
  }

  const mappedData = data.map(d => ({
    ...d,
    fill: colorMap[d.status] || "#8884d8"
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-white/10 p-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] backdrop-blur-xl">
          <p className="text-white/50 text-[10px] font-bold mb-1 tracking-[0.2em] uppercase">{payload[0].name}</p>
          <p className="text-white font-black text-2xl flex items-center">
             <span className="w-2.5 h-2.5 rounded-full mr-3 shadow-[0_0_10px_currentColor]" 
               style={{ 
                 backgroundColor: payload[0].payload.fill.includes('Open') ? '#ef4444' : payload[0].payload.fill.includes('Mitigated') ? '#eab308' : '#10b981', 
                 color: payload[0].payload.fill.includes('Open') ? '#ef4444' : payload[0].payload.fill.includes('Mitigated') ? '#eab308' : '#10b981' 
               }} 
             />
             {payload[0].value} <span className="text-[10px] font-medium text-white/30 ml-2 tracking-widest uppercase">Records</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegendText = (value: string) => {
    return <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{value}</span>;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="pieOpen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={1}/>
              <stop offset="95%" stopColor="#991b1b" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="pieMitigated" x1="0" y1="0" x2="1" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={1}/>
              <stop offset="95%" stopColor="#854d0e" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="pieResolved" x1="0" y1="0" x2="1" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
              <stop offset="95%" stopColor="#065f46" stopOpacity={0.8}/>
            </linearGradient>
            
            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="4" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={renderLegendText} verticalAlign="bottom" height={36} iconType="circle" />
          <Pie
            data={mappedData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={8}
            dataKey="count"
            nameKey="status"
            stroke="none"
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {mappedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} filter="url(#glow)" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
