'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  FileText,
  ArrowRight,
  Coins,
  Receipt,
} from 'lucide-react'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageBar } from '@/components/billing/UsageBar'
import { InvoiceTable } from '@/components/billing/InvoiceTable'
import { CreditPackCard } from '@/components/billing/CreditPackCard'

// -- Mock data (replace with Supabase queries when lib functions are wired) --

const mockPlan = {
  planName: 'Professional',
  priceDisplay: 'R1,500',
  frequency: 'monthly' as const,
  status: 'active',
  nextBillingDate: '2026-04-01',
  features: [
    'Up to 5 team members',
    'CRM + Email + Social modules',
    'AI content generation',
    '100 social posts/mo',
    '50 AI generations/mo',
    'Priority email support',
  ],
}

const mockUsage = [
  { label: 'Social Posts', used: 67, limit: 100, unit: 'posts' },
  { label: 'AI Generations', used: 42, limit: 50, unit: 'generations', showCredits: 25 },
  { label: 'Email Sends', used: 180, limit: 500, unit: 'emails' },
  { label: 'Agent Invocations', used: 12, limit: 20, unit: 'invocations' },
]

const mockInvoices = [
  {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-0003',
    amount: 150000,
    status: 'paid',
    issuedAt: '2026-03-01',
    paidAt: '2026-03-01',
  },
  {
    id: 'inv_002',
    invoiceNumber: 'INV-2026-0002',
    amount: 150000,
    status: 'paid',
    issuedAt: '2026-02-01',
    paidAt: '2026-02-01',
  },
  {
    id: 'inv_003',
    invoiceNumber: 'INV-2026-0001',
    amount: 150000,
    status: 'paid',
    issuedAt: '2026-01-01',
    paidAt: '2026-01-02',
  },
  {
    id: 'inv_004',
    invoiceNumber: 'INV-2025-0012',
    amount: 99900,
    status: 'paid',
    issuedAt: '2025-12-01',
    paidAt: '2025-12-01',
  },
  {
    id: 'inv_005',
    invoiceNumber: 'INV-2025-0011',
    amount: 99900,
    status: 'paid',
    issuedAt: '2025-11-01',
    paidAt: '2025-11-01',
  },
]

const mockCreditPacks = [
  {
    id: 'pack_social_50',
    name: 'Social Boost',
    description: '50 extra social media posts',
    metric: 'social_posts',
    creditAmount: 50,
    priceDisplay: 'R250',
  },
  {
    id: 'pack_ai_100',
    name: 'AI Power Pack',
    description: '100 additional AI generations',
    metric: 'ai_generations',
    creditAmount: 100,
    priceDisplay: 'R450',
  },
  {
    id: 'pack_email_500',
    name: 'Email Blast',
    description: '500 additional email sends',
    metric: 'email_sends',
    creditAmount: 500,
    priceDisplay: 'R350',
  },
  {
    id: 'pack_agent_25',
    name: 'Agent Boost',
    description: '25 additional agent invocations',
    metric: 'agent_invocations',
    creditAmount: 25,
    priceDisplay: 'R200',
  },
]

const mockActiveCredits = [
  { metric: 'ai_generations', remaining: 25, expiresAt: '2026-03-31' },
]

export default function BillingPage() {
  const [plan] = useState(mockPlan)
  const [usage] = useState(mockUsage)
  const [invoices] = useState(mockInvoices)
  const [creditPacks] = useState(mockCreditPacks)
  const [activeCredits] = useState(mockActiveCredits)

  function handlePurchasePack(packId: string) {
    // TODO: integrate with PayFast payment flow
    console.log('Purchase pack:', packId)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription, usage, and invoices
        </p>
      </div>

      {/* Top Grid: Plan + Usage */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column: Plan Card + Quick Actions */}
        <div className="space-y-6 lg:col-span-2">
          <PlanCard
            planName={plan.planName}
            priceDisplay={plan.priceDisplay}
            frequency={plan.frequency}
            status={plan.status}
            nextBillingDate={plan.nextBillingDate}
            features={plan.features}
          />

          {/* Quick Actions */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>Update Payment Method</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>Buy Credits</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Receipt className="h-4 w-4 text-brand-charcoal-400" />
                  <span>View All Invoices</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Usage Overview */}
        <div className="lg:col-span-3">
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">
                  Usage This Month
                </CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                  March 2026
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {usage.map((metric) => (
                  <UsageBar
                    key={metric.label}
                    label={metric.label}
                    used={metric.used}
                    limit={metric.limit}
                    unit={metric.unit}
                    showCredits={metric.showCredits}
                  />
                ))}
              </div>

              {/* Active Credits Summary */}
              {activeCredits.length > 0 && (
                <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-emerald-700">
                    Active Credit Packs
                  </p>
                  {activeCredits.map((credit) => (
                    <div
                      key={credit.metric}
                      className="mt-1 flex items-center justify-between text-xs text-emerald-600"
                    >
                      <span>
                        {credit.remaining} {credit.metric.replace('_', ' ')} credits remaining
                      </span>
                      <span className="text-emerald-400">
                        Expires {new Date(credit.expiresAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Invoices */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">
              Recent Invoices
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500">
              <FileText className="h-3.5 w-3.5" />
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <InvoiceTable invoices={invoices} />
        </CardContent>
      </Card>

      {/* Credit Packs */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Credit Packs</h2>
            <p className="text-sm text-gray-500">
              Need more capacity? Purchase additional credits anytime.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {creditPacks.map((pack) => (
            <CreditPackCard
              key={pack.id}
              id={pack.id}
              name={pack.name}
              description={pack.description}
              metric={pack.metric}
              creditAmount={pack.creditAmount}
              priceDisplay={pack.priceDisplay}
              onPurchase={handlePurchasePack}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
