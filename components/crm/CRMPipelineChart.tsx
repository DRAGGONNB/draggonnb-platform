'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StageData {
  stage: string
  count: number
  value: number
}

interface CRMPipelineChartProps {
  stageData: StageData[]
}

const STAGE_COLORS = [
  '#9ca3af', // Lead - gray
  '#3b82f6', // Qualified - blue
  '#eab308', // Proposal - yellow
  '#f97316', // Negotiation - orange
  '#22c55e', // Won - green
  '#ef4444', // Lost - red
]

export function CRMPipelineChart({ stageData }: CRMPipelineChartProps) {
  const hasData = stageData.some((s) => s.count > 0)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">
          Pipeline Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Deals']
                    return [value, name]
                  }}
                  labelFormatter={(label: string) => `Stage: ${label}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {stageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-500">No pipeline data yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Create deals to see your pipeline visualized here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
