'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarCheck,
  Users,
  BookOpen,
  ClipboardCheck,
  ShieldCheck,
  PartyPopper,
  QrCode,
  Menu,
  X,
  Waves,
  Receipt,
  ChefHat,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/restaurant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/restaurant/tables', label: 'Tables', icon: UtensilsCrossed },
  { href: '/restaurant/bills', label: 'Bills', icon: Receipt },
  { href: '/restaurant/menu', label: 'Menu', icon: ChefHat },
  { href: '/restaurant/reservations', label: 'Reservations', icon: CalendarCheck },
  { href: '/restaurant/staff', label: 'Staff', icon: Users },
  { href: '/restaurant/sops', label: 'SOPs & Checklists', icon: BookOpen },
  { href: '/restaurant/compliance/temps', label: 'Compliance', icon: ShieldCheck },
  { href: '/restaurant/events', label: 'Events', icon: PartyPopper },
  { href: '/restaurant/qr-codes', label: 'QR Codes', icon: QrCode },
]

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0077B6]">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">The Lookout Deck</h1>
            <p className="text-xs text-gray-500">Staff Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0077B6]/10 text-[#0077B6]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0077B6]">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">The Lookout Deck</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] z-30">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <nav className="relative bg-white border-b border-gray-200 px-3 py-3 space-y-1 shadow-lg max-h-[70vh] overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0077B6]/10 text-[#0077B6]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#0077B6]' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400"
        >
          <Menu className="w-5 h-5" />
          More
        </button>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:min-h-screen pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
