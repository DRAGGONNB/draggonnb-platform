'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Check, ArrowRight } from 'lucide-react'

interface PlanCardProps {
  planName: string
  priceDisplay: string // "R1,500"
  frequency: string // "monthly"
  status: string // subscription status
  nextBillingDate?: string
  features: string[]
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200',
  },
  payment_failed: {
    label: 'Payment Failed',
    className: 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200',
  },
}

export function PlanCard({
  planName,
  priceDisplay,
  frequency,
  status,
  nextBillingDate,
  features,
}: PlanCardProps) {
  const statusInfo = statusConfig[status] || statusConfig.pending
  const frequencyLabel = frequency === 'monthly' ? '/mo' : frequency === 'yearly' ? '/yr' : `/${frequency}`

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Current Plan</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">{planName}</h3>
          </div>
          <Badge variant="secondary" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900">{priceDisplay}</span>
          <span className="text-sm text-gray-500">{frequencyLabel}</span>
        </div>
        {nextBillingDate && (
          <p className="mt-1 text-xs text-gray-500">
            Next billing date: {new Date(nextBillingDate).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full gap-2">
          Change Plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
