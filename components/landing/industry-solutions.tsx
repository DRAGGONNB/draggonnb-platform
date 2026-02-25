'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  UtensilsCrossed,
  Puzzle,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const tabs = [
  { id: 'accommodation', label: 'Accommodation & Lodges', icon: Building2 },
  { id: 'restaurant', label: 'Restaurant & Events', icon: UtensilsCrossed },
  { id: 'custom', label: 'Custom Solutions', icon: Puzzle },
] as const

type TabId = (typeof tabs)[number]['id']

const accommodationFeatures = [
  'Variable pricing engine (seasonal, per-person, per-unit, per-room)',
  'Calendar + 3rd party booking sync',
  'Email manager for guest communications',
  'Property & maintenance management',
  'Staff coordination via Telegram',
  'Guest portal with self-service',
  'AI agent automation (WhatsApp/Telegram)',
  'Stock management',
  'Vehicle maintenance & licence tracking',
]

const accommodationDomains = ['Inventory', 'Pricing', 'Bookings', 'Payments', 'Operations', 'Guest Experience', 'Config']

const restaurantFeatures = [
  'Multi-entry API for POS/3rd party integration',
  'Existing system integration (not rip-and-replace)',
  'Staff SOPs via Telegram',
  'Guest WhatsApp for bookings & pre-orders',
  'Kitchen SOP management',
  'Food temperature scanning & logging',
  'Events coordination & checklists',
  'Booking management',
]

const customFeatures = [
  'AI agent lead scoring for your industry',
  'MVP plan with mock designs before build',
  'Your branding, your domain (white label)',
  'Modular database -- pick the tables you need',
  'CRM + Email + Social included in every build',
  'API access for custom integrations',
]

export function IndustrySolutionsSection() {
  const [activeTab, setActiveTab] = useState<TabId>('accommodation')

  return (
    <section id="solutions" className="border-t border-white/10 bg-brand-charcoal-800/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Built for{' '}
            <span className="gradient-text-brand">Your Industry</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            Deep, purpose-built modules -- not generic templates. Each solution includes
            AI agents, staff communication, and complete operational workflows.
          </p>
        </div>

        {/* Tab Triggers */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium transition-all sm:border-b-2 ${
                  isActive
                    ? 'border-brand-crimson-400 text-white'
                    : 'border-transparent text-brand-charcoal-300 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand-crimson-400' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-brand-crimson-500/20 bg-brand-charcoal-800/60 p-6 backdrop-blur-sm sm:p-8 lg:p-10">
          {activeTab === 'accommodation' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-5 text-xl font-semibold text-white">Complete Property Operations</h3>
                <ul className="space-y-3">
                  {accommodationFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-charcoal-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-crimson-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">35-table schema</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">7 operational domains</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Game Lodges</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Guest Houses</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-brand-charcoal-300">
                  From a single guest house to a multi-property game lodge, the accommodation
                  module handles inventory, pricing, bookings, payments, operations, guest
                  experience, and property configuration.
                </p>
                <div className="flex flex-wrap gap-2">
                  {accommodationDomains.map((domain) => (
                    <span key={domain} className="rounded bg-brand-charcoal-700 px-2.5 py-1 text-xs text-brand-charcoal-200">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'restaurant' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-5 text-xl font-semibold text-white">Kitchen to Table Operations</h3>
                <ul className="space-y-3">
                  {restaurantFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-charcoal-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-crimson-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-6 text-sm leading-relaxed text-brand-charcoal-300">
                  Purpose-built for South African restaurants, event venues, and hospitality
                  groups. Integrates with your existing POS and streamlines kitchen-to-table
                  operations.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">POS Integration</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Kitchen SOPs</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Events</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Restaurants</span>
                  <span className="rounded-full border border-brand-crimson-500/20 bg-brand-crimson-500/10 px-3 py-1 text-xs text-brand-crimson-300">Venues</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-5 text-xl font-semibold text-white">Your Business, Your Rules</h3>
                <ul className="space-y-3">
                  {customFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-charcoal-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-crimson-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-6 text-sm leading-relaxed text-brand-charcoal-300">
                  Every business is different. We build custom modules on top of the DraggonnB
                  platform, giving you the speed of SaaS with the flexibility of a custom build.
                </p>
                <Button asChild className="btn-brand rounded-lg">
                  <Link href="/qualify">
                    Tell Us What You Need
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
