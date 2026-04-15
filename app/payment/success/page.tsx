import Link from 'next/link'
import { CheckCircle, Clock, Rocket } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/payments/payfast'

interface PageProps {
  searchParams: Promise<{ tier?: string }>
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tierKey = params.tier
  const tier = tierKey ? PRICING_TIERS[tierKey] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-charcoal-900 to-brand-charcoal-800 text-white flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
          {tier ? (
            <div className="text-xl text-brand-charcoal-200 mb-2">
              Thank you for subscribing to the <span className="font-semibold text-white">{tier.name}</span> plan
            </div>
          ) : (
            <div className="text-xl text-brand-charcoal-200 mb-2">
              Thank you for subscribing to DraggonnB CRMM
            </div>
          )}
          {tier && (
            <div className="text-lg text-brand-charcoal-300">
              R{tier.price.toLocaleString()}/{tier.frequency}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-center">Your Onboarding Progress</h2>
          <div className="bg-brand-charcoal-700/50 border border-brand-charcoal-500 rounded-lg p-6">
            {/* Desktop: Horizontal Progress */}
            <div className="hidden md:flex items-center justify-between gap-4">
              {/* Step 1 - Complete */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-400">Step 1: Payment Complete</div>
                  <div className="text-xs text-brand-charcoal-300">Subscription activated</div>
                </div>
              </div>
              <div className="w-8 h-0.5 bg-orange-500"></div>

              {/* Step 2 - In Progress */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-400">Step 2: Provisioning</div>
                  <div className="text-xs text-brand-charcoal-300">Setting up your account</div>
                </div>
              </div>
              <div className="w-8 h-0.5 bg-gray-600"></div>

              {/* Step 3 - Pending */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-brand-charcoal-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-brand-charcoal-300">Step 3: Ready to Use</div>
                  <div className="text-xs text-brand-charcoal-400">Dashboard access</div>
                </div>
              </div>
            </div>

            {/* Mobile: Vertical Progress */}
            <div className="md:hidden space-y-4">
              {/* Step 1 - Complete */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="text-sm font-semibold text-green-400">Step 1: Payment Complete</div>
                  <div className="text-xs text-brand-charcoal-300">Subscription activated</div>
                </div>
              </div>
              <div className="ml-6 w-0.5 h-6 bg-orange-500"></div>

              {/* Step 2 - In Progress */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="text-sm font-semibold text-orange-400">Step 2: Provisioning</div>
                  <div className="text-xs text-brand-charcoal-300">Setting up your account</div>
                </div>
              </div>
              <div className="ml-6 w-0.5 h-6 bg-gray-600"></div>

              {/* Step 3 - Pending */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-brand-charcoal-300" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="text-sm font-semibold text-brand-charcoal-300">Step 3: Ready to Use</div>
                  <div className="text-xs text-brand-charcoal-400">Dashboard access</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-brand-charcoal-700/50 border border-brand-charcoal-500 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">What happens next?</h2>
          <ul className="space-y-4 text-brand-charcoal-200">
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold mt-0.5 flex-shrink-0">✓</span>
              <div>
                <div className="font-medium text-white">Account Provisioning (5-10 minutes)</div>
                <div className="text-sm text-brand-charcoal-300">We&apos;re setting up your isolated database, CRM, and automation workflows</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold mt-0.5 flex-shrink-0">✓</span>
              <div>
                <div className="font-medium text-white">Welcome Email (within 15 minutes)</div>
                <div className="text-sm text-brand-charcoal-300">Check your inbox for login credentials and quick start guide</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold mt-0.5 flex-shrink-0">✓</span>
              <div>
                <div className="font-medium text-white">Onboarding Call (scheduled via email)</div>
                <div className="text-sm text-brand-charcoal-300">30-minute session to connect your social accounts and configure workflows</div>
              </div>
            </li>
          </ul>
        </div>

        {tier && (
          <div className="bg-brand-crimson-900/30 border border-brand-crimson-700/50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-3">Your {tier.name} Plan Includes</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-brand-charcoal-200">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-brand-crimson-400 mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full py-3 px-4 btn-brand rounded-lg font-semibold transition-colors text-center min-h-[48px] flex items-center justify-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-4 border border-brand-charcoal-500 hover:border-brand-charcoal-400 rounded-lg font-semibold transition-colors text-center min-h-[48px] flex items-center justify-center"
          >
            Back to Home
          </Link>
        </div>

        {/* Support Info */}
        <p className="text-sm text-brand-charcoal-300 mt-8 text-center">
          Questions? <a href="mailto:info@draggonnb.online" className="text-brand-crimson-400 hover:text-brand-crimson-300">
            Contact our team
          </a>
        </p>
      </div>
    </div>
  )
}
