
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface PlayersByCategoryChartProps {
  data: ChartData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-background border rounded-md shadow-md text-sm">
        <p className="font-bold">{`${data.name}: ${data.value} joueur(s)`}</p>
        <p className="text-muted-foreground">{`(${(payload[0].percent * 100).toFixed(2)}%)`}</p>
      </div>
    );
  }
  return null;
};

export function PlayersByCategoryChart({ data }: PlayersByCategoryChartProps) {
  const isMobile = useIsMobile();
  // Sort data alphabetically by category for consistent display
  const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sortedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={isMobile ? 80 : 100}
            innerRadius={isMobile ? 50 : 60} // This creates the donut chart effect
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            iconType="circle" 
            layout={isMobile ? "horizontal" : "vertical"} 
            verticalAlign={isMobile ? "bottom" : "middle"} 
            align={isMobile ? "center" : "right"}
            wrapperStyle={isMobile ? { bottom: -10 } : {}}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
