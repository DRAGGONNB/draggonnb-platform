'use client'

import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  {
    section: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊', badge: null },
      { name: 'Autopilot', href: '/autopilot', icon: '🤖', badge: 'NEW', badgeColor: 'bg-gradient-to-r from-purple-500 to-purple-600' },
      { name: 'CRM', href: '/crm', icon: '👥', badge: null },
      { name: 'Email Hub', href: '/email', icon: '📧', badge: null },
    ],
  },
  {
    section: 'Email Marketing',
    items: [
      { name: 'Campaigns', href: '/email/campaigns', icon: '📨', badge: null },
      { name: 'Sequences', href: '/email/sequences', icon: '🔄', badge: null },
      { name: 'Templates', href: '/email/templates', icon: '📝', badge: null },
      { name: 'Outreach', href: '/email/outreach', icon: '🎯', badge: null },
      { name: 'Analytics', href: '/email/analytics', icon: '📈', badge: null },
    ],
  },
  {
    section: 'Content Studio',
    items: [
      { name: 'Content Studio', href: '/content-generator', icon: '✨', badge: null },
      { name: 'Email Content', href: '/content-generator/email', icon: '📧', badge: null },
      { name: 'Social Content', href: '/content-generator/social', icon: '📱', badge: null },
    ],
  },
  {
    section: 'Accommodation',
    items: [
      { name: 'Overview', href: '/accommodation', icon: '🏨', badge: 'NEW', badgeColor: 'bg-gradient-to-r from-blue-500 to-blue-600' },
      { name: 'Properties', href: '/accommodation/properties', icon: '🏠', badge: null },
      { name: 'Inquiries', href: '/accommodation/inquiries', icon: '📋', badge: null },
      { name: 'Guests', href: '/accommodation/guests', icon: '👤', badge: null },
    ],
  },
  {
    section: 'Settings',
    items: [
      { name: 'Social Accounts', href: '/settings/social', icon: '🔗', badge: null },
    ],
  },
  {
    section: 'Account',
    items: [
      { name: 'Pricing', href: '/pricing', icon: '💳', badge: null },
    ],
  },
]

interface UsageStats {
  postsUsed: number
  postsLimit: number
  aiGenerationsUsed: number
  aiGenerationsLimit: number
}

interface SidebarProps {
  usageStats?: UsageStats
}

export function Sidebar({ usageStats }: SidebarProps) {
  const pathname = usePathname()

  const defaultUsage: UsageStats = {
    postsUsed: 23,
    postsLimit: 30,
    aiGenerationsUsed: 45,
    aiGenerationsLimit: 50,
  }

  const usage = usageStats || defaultUsage

  const postsPercentage = (usage.postsUsed / usage.postsLimit) * 100
  const aiPercentage = (usage.aiGenerationsUsed / usage.aiGenerationsLimit) * 100

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-full flex-col overflow-y-auto py-6">
        {/* Logo */}
        <div className="mb-8 px-6">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-base font-bold text-transparent">
            🚀 DraggonnB POWER CRM
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 px-3">
          {navigation.map((section) => (
            <div key={section.section}>
              {section.section !== 'Main' && (
                <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.section}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'border-l-3 bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded text-xs',
                          isActive && 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                            item.badgeColor || 'bg-gradient-to-r from-orange-500 to-orange-600'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Usage Stats Footer */}
        <div className="border-t bg-gray-50 px-6 py-6">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-medium">
                <span>Posts This Month</span>
                <span>
                  {usage.postsUsed} / {usage.postsLimit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-700"
                  style={{ width: `${postsPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-medium">
                <span>AI Generations</span>
                <span>
                  {usage.aiGenerationsUsed} / {usage.aiGenerationsLimit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-700"
                  style={{ width: `${aiPercentage}%` }}
                />
              </div>
            </div>
            <Link
              href="/pricing"
              className="mt-3 block w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
