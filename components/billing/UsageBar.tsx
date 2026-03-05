'use client'

import { Badge } from '@/components/ui/badge'

interface UsageBarProps {
  label: string
  used: number
  limit: number // -1 = unlimited
  unit?: string // 'posts', 'generations', 'emails'
  showCredits?: number // extra credits from packs
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500'
  if (percentage >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getBarTrackColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-100'
  if (percentage >= 60) return 'bg-amber-100'
  return 'bg-emerald-100'
}

export function UsageBar({ label, used, limit, unit = '', showCredits }: UsageBarProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 100 : Math.min((used / limit) * 100, 100)
  const barColor = isUnlimited ? 'bg-emerald-500' : getBarColor(percentage)
  const trackColor = isUnlimited ? 'bg-emerald-100' : getBarTrackColor(percentage)

  const usageText = isUnlimited
    ? `${used} ${unit}`
    : `${used} / ${limit.toLocaleString()} ${unit}`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {isUnlimited ? (
              <span className="font-medium text-emerald-600">Unlimited</span>
            ) : (
              usageText
            )}
          </span>
          {showCredits && showCredits > 0 ? (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] px-1.5 py-0"
            >
              +{showCredits} credits
            </Badge>
          ) : null}
        </div>
      </div>
      <div className={`h-2 w-full overflow-hidden rounded-full ${trackColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
