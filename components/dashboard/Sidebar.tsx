'use client'

import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Users,
  Mail,
  Send,
  RefreshCw,
  FileText,
  Target,
  BarChart3,
  Sparkles,
  Smartphone,
  Building2,
  Home,
  ClipboardList,
  UserCircle,
  Link2,
  CreditCard,
  ArrowUpRight,
  Cpu,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  badge: string | null
  badgeColor: string
}

interface NavSection {
  section: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    section: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null, badgeColor: '' },
      { name: 'CRM', href: '/crm', icon: Users, badge: null, badgeColor: '' },
      { name: 'Email Hub', href: '/email', icon: Mail, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'AI Agents',
    items: [
      { name: 'Autopilot', href: '/autopilot', icon: Bot, badge: 'NEW', badgeColor: 'bg-brand-crimson-500' },
      { name: 'AI Workflows', href: '/autopilot/workflows', icon: Zap, badge: null, badgeColor: '' },
      { name: 'Agent Settings', href: '/autopilot/settings', icon: Cpu, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'Email Marketing',
    items: [
      { name: 'Campaigns', href: '/email/campaigns', icon: Send, badge: null, badgeColor: '' },
      { name: 'Sequences', href: '/email/sequences', icon: RefreshCw, badge: null, badgeColor: '' },
      { name: 'Templates', href: '/email/templates', icon: FileText, badge: null, badgeColor: '' },
      { name: 'Outreach', href: '/email/outreach', icon: Target, badge: null, badgeColor: '' },
      { name: 'Analytics', href: '/email/analytics', icon: BarChart3, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'Content Studio',
    items: [
      { name: 'Content Studio', href: '/content-generator', icon: Sparkles, badge: null, badgeColor: '' },
      { name: 'Email Content', href: '/content-generator/email', icon: Mail, badge: null, badgeColor: '' },
      { name: 'Social Content', href: '/content-generator/social', icon: Smartphone, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'Accommodation',
    items: [
      { name: 'Overview', href: '/accommodation', icon: Building2, badge: 'NEW', badgeColor: 'bg-brand-crimson-500' },
      { name: 'Properties', href: '/accommodation/properties', icon: Home, badge: null, badgeColor: '' },
      { name: 'Inquiries', href: '/accommodation/inquiries', icon: ClipboardList, badge: null, badgeColor: '' },
      { name: 'Guests', href: '/accommodation/guests', icon: UserCircle, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { name: 'Social Accounts', href: '/settings/social', icon: Link2, badge: null, badgeColor: '' },
    ],
  },
  {
    section: 'Account',
    items: [
      { name: 'Pricing', href: '/pricing', icon: CreditCard, badge: null, badgeColor: '' },
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          {/* Replace /logo.svg with /logo.png when you add your actual logo file */}
          <Image
            src="/logo.svg"
            alt="DraggonnB"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight">
              <span className="text-brand-charcoal-500">DRAGGON</span>
              <span className="text-brand-crimson-500">NB</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Operating System
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navigation.map((section) => (
            <div key={section.section}>
              {section.section !== 'Main' && (
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.section}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name + item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'border-l-[3px] border-brand-crimson-500 bg-brand-crimson-50 text-brand-crimson-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          isActive ? 'text-brand-crimson-600' : 'text-gray-400 group-hover:text-gray-600'
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
                            item.badgeColor || 'bg-brand-crimson-500'
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
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-5">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-gray-500">
                <span>Posts This Month</span>
                <span className="text-gray-700">
                  {usage.postsUsed} / {usage.postsLimit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-crimson-400 transition-all"
                  style={{ width: `${postsPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-gray-500">
                <span>AI Generations</span>
                <span className="text-gray-700">
                  {usage.aiGenerationsUsed} / {usage.aiGenerationsLimit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-charcoal-300 transition-all"
                  style={{ width: `${aiPercentage}%` }}
                />
              </div>
            </div>
            <Link
              href="/pricing"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-crimson-500 px-4 py-2 text-center text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-crimson-600 hover:shadow-md"
            >
              Upgrade Plan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
