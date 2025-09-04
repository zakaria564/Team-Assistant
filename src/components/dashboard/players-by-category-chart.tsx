
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface ChartData {
  category: string;
  total: number;
}

interface PlayersByCategoryChartProps {
  data: ChartData[];
}

const chartConfig = {
  players: {
    label: "Joueurs",
  },
} satisfies ChartConfig

export function PlayersByCategoryChart({ data }: PlayersByCategoryChartProps) {

  // Sort data alphabetically by category for consistent display
  const sortedData = [...data].sort((a, b) => a.category.localeCompare(b.category));
  
  return (
    <div className="h-[250px] w-full">
         <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={sortedData} 
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    accessibilityLayer
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        fontSize={12}
                    />
                    <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        fontSize={12}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        cursor={false}
                        content={<ChartTooltipContent 
                            labelKey="total" 
                            nameKey="category"
                            indicator="dot"
                        />} 
                    />
                    <Bar 
                        dataKey="total" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
  )
}
