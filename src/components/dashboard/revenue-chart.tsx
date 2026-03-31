'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ChartDataPoint {
  month: string
  facturado: number
  cobrado: number
}

interface RevenueChartProps {
  data: ChartDataPoint[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-2 border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-2 capitalize">{entry.name}:</span>
            <span className="text-white font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradFacturado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#CAFF00" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#CAFF00" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCobrado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => {
            if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
            if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
            return `$${v}`
          }}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#888' }}
          formatter={(value) => (
            <span style={{ color: '#888888', fontSize: 11 }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="facturado"
          name="facturado"
          stroke="#CAFF00"
          strokeWidth={2}
          fill="url(#gradFacturado)"
          dot={{ fill: '#CAFF00', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#CAFF00' }}
        />
        <Area
          type="monotone"
          dataKey="cobrado"
          name="cobrado"
          stroke="#4ade80"
          strokeWidth={2}
          fill="url(#gradCobrado)"
          dot={{ fill: '#4ade80', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#4ade80' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
