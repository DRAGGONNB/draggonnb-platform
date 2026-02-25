'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/payments/payfast'

export default function PricingPage() {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId)
    setIsLoading(true)
    router.push(`/signup?tier=${tierId}`)
  }

  const canonicalTiers = ['core', 'growth', 'scale'] as const
  const displayTiers = canonicalTiers
    .filter((id) => PRICING_TIERS[id])
    .map((id) => [id, PRICING_TIERS[id]] as const)

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-charcoal-900 to-brand-charcoal-800 text-white">
      {/* Header */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="mb-8 inline-flex items-baseline gap-1.5">
            <span className="text-xl font-bold gradient-text-brand">DraggonnB</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-charcoal-300">OS</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Transparent Pricing, <span className="gradient-text-brand">Powerful Modules</span>
          </h1>
          <p className="text-xl text-brand-charcoal-200 mb-8">
            Choose the perfect plan for your business. All plans include 14-day free trial.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {displayTiers.map(([tierId, tier]) => (
            <div
              key={tierId}
              className={`relative flex flex-col rounded-xl border transition-all duration-300 ${
                selectedTier === tierId
                  ? 'border-brand-crimson-500 bg-brand-charcoal-800 ring-2 ring-brand-crimson-500'
                  : tierId === 'growth'
                    ? 'border-brand-crimson-500/50 bg-brand-charcoal-800 shadow-lg shadow-brand-crimson-500/10'
                    : 'border-white/10 bg-brand-charcoal-800/60 hover:border-brand-charcoal-400'
              }`}
            >
              {/* Popular Badge */}
              {tierId === 'growth' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-gradient-to-r from-brand-crimson-600 to-brand-crimson-500 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex-1 p-8">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">R{tier.price.toLocaleString()}</span>
                  <span className="text-brand-charcoal-300 ml-2">/{tier.frequency}</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-brand-charcoal-200">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-8 pb-8">
                <button
                  onClick={() => handleSelectTier(tierId)}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    tierId === 'growth'
                      ? 'btn-brand'
                      : 'bg-brand-charcoal-600 hover:bg-brand-charcoal-500 disabled:bg-brand-charcoal-400 text-white border border-brand-charcoal-400'
                  }`}
                >
                  {isLoading && selectedTier === tierId ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-16 sm:px-6 lg:px-8 bg-brand-charcoal-900/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-brand-charcoal-200">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-brand-charcoal-200">
                We accept all major credit/debit cards and EFT via PayFast, South Africa&apos;s trusted payment gateway.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Is there a setup fee?</h3>
              <p className="text-brand-charcoal-200">
                No setup fees! We&apos;ll provision your account automatically within 48 hours.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">What if I need more than the plan limits?</h3>
              <p className="text-brand-charcoal-200">
                Upgrade to a higher tier or contact our sales team for custom Enterprise solutions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">How does recurring billing work?</h3>
              <p className="text-brand-charcoal-200">
                PayFast automatically charges your payment method monthly. You can cancel anytime with no penalties.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="px-4 py-12 sm:px-6 lg:px-8 bg-brand-charcoal-800">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-brand-charcoal-200 mb-6">
            Join South African businesses already using DraggonnB to run their operations.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/qualify" className="btn-brand rounded-lg">
              Start Your Digital Journey
            </Link>
            <Link
              href="mailto:support@draggonnb.co.za"
              className="px-8 py-3 border border-brand-charcoal-500 hover:border-brand-charcoal-400 rounded-lg font-semibold transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
