'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Share2,
  Sparkles,
  Mail,
  Bot,
  type LucideIcon,
} from 'lucide-react'

interface CreditPackCardProps {
  id: string
  name: string
  description: string
  metric: string
  creditAmount: number
  priceDisplay: string
  onPurchase?: (packId: string) => void
}

const metricIcons: Record<string, LucideIcon> = {
  social_posts: Share2,
  ai_generations: Sparkles,
  email_sends: Mail,
  agent_invocations: Bot,
}

const metricColors: Record<string, string> = {
  social_posts: 'bg-blue-50 text-blue-600',
  ai_generations: 'bg-amber-50 text-amber-600',
  email_sends: 'bg-brand-charcoal-50 text-brand-charcoal-400',
  agent_invocations: 'bg-purple-50 text-purple-600',
}

export function CreditPackCard({
  id,
  name,
  description,
  metric,
  creditAmount,
  priceDisplay,
  onPurchase,
}: CreditPackCardProps) {
  const Icon = metricIcons[metric] || Sparkles
  const colorClass = metricColors[metric] || 'bg-gray-50 text-gray-600'

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900">{name}</h4>
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-lg font-bold text-gray-900">
                {creditAmount.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">credits</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-semibold text-gray-900">{priceDisplay}</span>
            <Button
              size="sm"
              onClick={() => onPurchase?.(id)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Buy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
