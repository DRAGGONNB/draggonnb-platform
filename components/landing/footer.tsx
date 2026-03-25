import Image from 'next/image'
import Link from 'next/link'

const footerLinks = {
  Platform: [
    { label: 'CRM & Pipeline', href: '#modules' },
    { label: 'Email Marketing', href: '#modules' },
    { label: 'Content Studio', href: '#modules' },
    { label: 'AI Agents', href: '#modules' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Industries: [
    { label: 'Accounting', href: '#industries' },
    { label: 'Hospitality', href: '#industries' },
    { label: 'Real Estate', href: '#industries' },
    { label: 'Professional Services', href: '#industries' },
    { label: 'Retail', href: '#industries' },
    { label: 'Healthcare', href: '#industries' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Contact', href: 'mailto:support@draggonnb.co.za' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
}

const socialLinks = [
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-[#A8A9AD]/20 bg-[#1A1B1E] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <Image src="/logo.png" alt="DraggonnB" width={32} height={32} className="rounded-lg" />
              <span className="font-display text-xl font-bold text-white">DRAGGON<span className="text-[#6B1420]">NB</span></span>
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-[#A8A9AD]">
              The all-in-one CRM and marketing platform built for South African businesses.
              Manage clients, automate campaigns, and grow revenue from a single platform.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#A8A9AD] transition-all hover:border-[#6B1420]/30 hover:bg-[#6B1420]/10 hover:text-white"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-semibold text-white">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#A8A9AD] transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#A8A9AD]/20 pt-8 sm:flex-row">
          <p className="text-xs text-[#A8A9AD]">
            &copy; {new Date().getFullYear()} DraggonnB. All rights reserved.
          </p>
          <p className="text-xs text-[#A8A9AD]">
            Powered by <span className="gradient-text-brand font-semibold">DraggonnB</span> -- Built in South Africa, for South Africa.
          </p>
        </div>
      </div>
    </footer>
  )
}
