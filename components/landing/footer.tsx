import Link from 'next/link'

const footerLinks = {
  Solutions: [
    { label: 'Accommodation & Lodges', href: '#solutions' },
    { label: 'Restaurant & Events', href: '#solutions' },
    { label: 'Custom Solutions', href: '#solutions' },
  ],
  Platform: [
    { label: 'Modules', href: '#modules' },
    { label: 'AI Agents', href: '#how-it-works' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '#how-it-works' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: 'mailto:support@draggonnb.co.za' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-brand-charcoal-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-3 inline-flex items-baseline gap-1.5">
              <span className="text-xl font-bold gradient-text-brand">DraggonnB</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-charcoal-400">OS</span>
            </Link>
            <p className="text-sm leading-relaxed text-brand-charcoal-400">
              AI-powered business operating system for South African SMEs. Accommodation,
              restaurant, and custom industry modules -- all with AI agents built in.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-3 text-sm font-semibold text-white">{heading}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-charcoal-400 transition-colors hover:text-brand-charcoal-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-brand-charcoal-500">
            Made for South African SMEs. All prices in ZAR.
          </p>
          <p className="text-xs text-brand-charcoal-500">
            &copy; {new Date().getFullYear()} DraggonnB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
