'use client'

import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'
import { Menu, X, ChevronDown, Building2, UtensilsCrossed, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const solutionItems = [
  { icon: Building2, label: 'Accommodation & Lodges', href: '#solutions' },
  { icon: UtensilsCrossed, label: 'Restaurant & Events', href: '#solutions' },
  { icon: Puzzle, label: 'Custom Solutions', href: '#solutions' },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const openDropdown = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDropdownOpen(true)
  }, [])

  const closeDropdown = useCallback(() => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(false), 200)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-brand-charcoal-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold gradient-text-brand">DraggonnB</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-charcoal-300">OS</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
          >
            <button
              className="flex items-center gap-1 text-sm text-brand-charcoal-200 transition-colors hover:text-white"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              Solutions
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-1/2 top-full pt-2 -translate-x-1/2">
                <div className="w-64 rounded-xl border border-white/10 bg-brand-charcoal-800/95 p-2 shadow-2xl backdrop-blur-xl">
                  {solutionItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-charcoal-200 transition-colors hover:bg-brand-crimson-500/10 hover:text-white"
                      >
                        <Icon className="h-4 w-4 text-brand-crimson-400" />
                        {item.label}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <a href="#modules" className="text-sm text-brand-charcoal-200 transition-colors hover:text-white">
            Modules
          </a>
          <a href="#pricing" className="text-sm text-brand-charcoal-200 transition-colors hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="text-sm text-brand-charcoal-200 transition-colors hover:text-white">
            Log In
          </Link>
          <Button asChild size="lg" className="btn-brand rounded-lg px-6 py-2 text-sm">
            <Link href="/qualify">Start Your Journey</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-brand-charcoal-200 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-brand-charcoal-900/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4 px-4 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-charcoal-400">Solutions</p>
            {solutionItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 pl-2 text-sm text-brand-charcoal-200 transition-colors hover:text-white"
                >
                  <Icon className="h-4 w-4 text-brand-crimson-400" />
                  {item.label}
                </a>
              )
            })}
            <div className="my-1 h-px bg-white/10" />
            <a
              href="#modules"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-brand-charcoal-200 transition-colors hover:text-white"
            >
              Modules
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-brand-charcoal-200 transition-colors hover:text-white"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-sm text-brand-charcoal-200 transition-colors hover:text-white"
            >
              Log In
            </Link>
            <Button asChild size="lg" className="btn-brand w-full rounded-lg text-sm">
              <Link href="/qualify">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
