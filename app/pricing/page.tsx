'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/payments/payfast'

export default function PricingPage() {
  const router = useRouter()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [annual, setAnnual] = useState(false)

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
    <div className="min-h-screen bg-[#363940]">
      {/* Header - Dark */}
      <div className="bg-[#363940] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2">
            <Image src="/logo.png" alt="DraggonnB" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-xl font-bold text-white">DRAGGON<span className="text-[#6B1420]">NB</span></span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A9AD]">OS</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
            Transparent Pricing, <span className="gradient-text-brand">Powerful Modules</span>
          </h1>
          <p className="text-xl text-[#A8A9AD] mb-8">
            Choose the perfect plan for your business. All plans include 14-day free trial.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-[#A8A9AD]'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annual ? 'bg-[#6B1420]' : 'bg-[#A8A9AD]/30'}`}
              role="switch"
              aria-checked={annual}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-[#A8A9AD]'}`}>
              Annual <span className="text-[#6B1420] font-semibold">(Save 10%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Cards - Light */}
      <div className="bg-[#F5F5F6] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {displayTiers.map(([tierId, tier]) => (
            <div
              key={tierId}
              className={`relative flex flex-col rounded-xl border transition-all duration-300 ${
                selectedTier === tierId
                  ? 'border-[#6B1420] bg-white ring-2 ring-[#6B1420]'
                  : tierId === 'growth'
                    ? 'border-[#6B1420] bg-white shadow-lg shadow-[#6B1420]/10'
                    : 'border-[#C0C1C4]/50 bg-white shadow-md hover:border-[#C0C1C4]'
              }`}
            >
              {/* Popular Badge */}
              {tierId === 'growth' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-[#6B1420] px-4 py-1 rounded-full text-sm font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex-1 p-8">
                <h3 className="text-2xl font-bold text-[#363940] mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#363940]">
                    R{annual ? Math.round(tier.price * 10.8 / 12).toLocaleString() : tier.price.toLocaleString()}
                  </span>
                  <span className="text-[#A8A9AD] ml-2">/{tier.frequency}</span>
                  {annual && (
                    <p className="mt-1 text-sm text-[#6B1420]">
                      R{Math.round(tier.price * 10.8).toLocaleString()} billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#6B1420] flex-shrink-0 mt-0.5" />
                      <span className="text-[#A8A9AD]">{feature}</span>
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
                      : 'bg-white hover:bg-[#F5F5F6] text-[#363940] border border-[#C0C1C4] hover:border-[#A8A9AD]'
                  }`}
                >
                  {isLoading && selectedTier === tierId ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section - Light */}
      <div className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-[#363940] mb-12">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#363940] mb-2">Can I change my plan later?</h3>
              <p className="text-[#A8A9AD]">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#363940] mb-2">What payment methods do you accept?</h3>
              <p className="text-[#A8A9AD]">
                We accept all major credit/debit cards and EFT via PayFast, South Africa&apos;s trusted payment gateway.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#363940] mb-2">Is there a setup fee?</h3>
              <p className="text-[#A8A9AD]">
                No setup fees! We&apos;ll provision your account automatically within 48 hours.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#363940] mb-2">What if I need more than the plan limits?</h3>
              <p className="text-[#A8A9AD]">
                Upgrade to a higher tier or contact our sales team for custom Enterprise solutions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#363940] mb-2">How does recurring billing work?</h3>
              <p className="text-[#A8A9AD]">
                PayFast automatically charges your payment method monthly. You can cancel anytime with no penalties.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer - Dark */}
      <div className="px-4 py-12 sm:px-6 lg:px-8 bg-[#363940] text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Ready to get started?</h2>
          <p className="text-[#A8A9AD] mb-6">
            Join South African businesses already using DraggonnB to run their operations.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/qualify" className="btn-brand rounded-lg">
              Start Your Digital Journey
            </Link>
            <Link
              href="mailto:support@draggonnb.online"
              className="px-8 py-3 border border-[#A8A9AD]/30 hover:border-[#A8A9AD]/50 rounded-lg font-semibold transition-colors text-white hover:bg-white/5"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
