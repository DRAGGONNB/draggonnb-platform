'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Bell, HelpCircle, UserPlus, FileText, Mail, Sparkles, Bot } from 'lucide-react'

const newActions = [
  { label: 'Autopilot', href: '/autopilot', icon: Bot },
  { label: 'New Contact', href: '/crm/contacts?action=new', icon: UserPlus },
  { label: 'New Deal', href: '/crm/deals?action=new', icon: FileText },
  { label: 'New Campaign', href: '/email/campaigns', icon: Mail },
  { label: 'Generate Content', href: '/content-generator', icon: Sparkles },
]

const breadcrumbMap: Record<string, string[]> = {
  '/dashboard': ['Dashboard', 'Overview'],
  '/autopilot': ['AI Agents', 'Autopilot'],
  '/autopilot/settings': ['AI Agents', 'Settings'],
  '/autopilot/workflows': ['AI Agents', 'Workflows'],
  '/crm': ['CRM', 'Overview'],
  '/crm/contacts': ['CRM', 'Contacts'],
  '/crm/deals': ['CRM', 'Deals'],
  '/crm/companies': ['CRM', 'Companies'],
  '/email': ['Email Hub', 'Overview'],
  '/content-generator': ['Content Studio', 'Overview'],
}

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const crumbs = breadcrumbMap[pathname] || ['Dashboard', 'Overview']

  return (
    <header className="fixed left-64 right-0 top-0 z-30 border-b bg-white">
      <div className="flex h-18 flex-col justify-between px-8">
        {/* Top Row */}
        <div className="flex items-center gap-4 pt-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search everything..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-600 placeholder-gray-400 transition-all focus:border-brand-crimson-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-crimson-400/20"
            />
          </div>

          {/* Right Side Actions */}
          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg bg-brand-crimson-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-crimson-600 hover:shadow-md"
              >
                + New
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border bg-white py-1 shadow-xl z-50">
                  {newActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setShowMenu(false)
                        router.push(action.href)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <action.icon className="h-4 w-4 text-gray-400" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:border-gray-300 hover:bg-white">
              <Bell className="h-4 w-4" />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:border-gray-300 hover:bg-white">
              <HelpCircle className="h-4 w-4" />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-crimson-500 text-sm font-bold text-white transition-all hover:bg-brand-crimson-600">
              <span className="sr-only">User menu</span>
            </button>
          </div>
        </div>

        {/* Bottom Row - Breadcrumb */}
        <div className="flex items-center gap-2 pb-3 text-xs text-gray-500">
          <span>{crumbs[0]}</span>
          <span className="text-gray-300">/</span>
          <span>{crumbs[1]}</span>
        </div>
      </div>
    </header>
  )
}
