'use client'

import { useState, FormEvent } from 'react'
import { Rocket, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function RegisterInterestSection() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const payload = {
      contact_name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      company_name: String(data.get('company') || '').trim(),
      phone: String(data.get('phone') || '').trim() || null,
      industry: String(data.get('industry') || '') || null,
      source: 'launch_interest',
      business_issues: ['launching_soon_interest'],
      honeypot: String(data.get('website_url') || ''),
    }

    if (!payload.email || !payload.company_name) {
      setStatus('error')
      setErrorMsg('Please provide your email and business name.')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Something went wrong. Please try again.')
      }
      setStatus('success')
      form.reset()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  return (
    <section
      id="register-interest"
      className="relative overflow-hidden bg-[#2D2F33] px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#6B1420]/[0.15] blur-[120px]" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6B1420]/40 bg-[#6B1420]/10 px-4 py-1.5 text-sm text-white">
            <Rocket className="h-4 w-4 text-[#6B1420]" />
            Launching Soon
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold text-white lg:text-5xl">
            Register Your{' '}
            <span className="gradient-text-brand">Interest</span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[#A8A9AD]">
            Be first in line when we open the doors. Early registrants get
            priority onboarding, a 14-day free trial, and a founding-member
            discount locked in.
          </p>
        </div>

        {status === 'success' ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-[#6B1420]/40 bg-[#6B1420]/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#6B1420]/20">
              <Check className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 font-display text-2xl font-bold text-white">
              You're on the list.
            </h3>
            <p className="text-[#A8A9AD]">
              Thanks -- we'll be in touch as soon as your launch invite is
              ready. Keep an eye on your inbox.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm sm:p-8"
          >
            {/* honeypot field (hidden from users, visible to bots) */}
            <input
              type="text"
              name="website_url"
              tabIndex={-1}
              autoComplete="off"
              className="absolute h-0 w-0 opacity-0"
              aria-hidden="true"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="ri-name">
                  Your Name
                </label>
                <input
                  id="ri-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Dlamini"
                  className="w-full rounded-lg border border-white/15 bg-[#1F2126] px-4 py-2.5 text-sm text-white placeholder:text-[#A8A9AD]/60 focus:border-[#6B1420] focus:outline-none focus:ring-2 focus:ring-[#6B1420]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="ri-email">
                  Email <span className="text-[#6B1420]">*</span>
                </label>
                <input
                  id="ri-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.co.za"
                  className="w-full rounded-lg border border-white/15 bg-[#1F2126] px-4 py-2.5 text-sm text-white placeholder:text-[#A8A9AD]/60 focus:border-[#6B1420] focus:outline-none focus:ring-2 focus:ring-[#6B1420]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="ri-phone">
                  Phone
                </label>
                <input
                  id="ri-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+27 82 123 4567"
                  className="w-full rounded-lg border border-white/15 bg-[#1F2126] px-4 py-2.5 text-sm text-white placeholder:text-[#A8A9AD]/60 focus:border-[#6B1420] focus:outline-none focus:ring-2 focus:ring-[#6B1420]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="ri-company">
                  Business Name <span className="text-[#6B1420]">*</span>
                </label>
                <input
                  id="ri-company"
                  name="company"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="Lookout Deck (Pty) Ltd"
                  className="w-full rounded-lg border border-white/15 bg-[#1F2126] px-4 py-2.5 text-sm text-white placeholder:text-[#A8A9AD]/60 focus:border-[#6B1420] focus:outline-none focus:ring-2 focus:ring-[#6B1420]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="ri-industry">
                  Industry
                </label>
                <select
                  id="ri-industry"
                  name="industry"
                  defaultValue=""
                  className="w-full rounded-lg border border-white/15 bg-[#1F2126] px-4 py-2.5 text-sm text-white focus:border-[#6B1420] focus:outline-none focus:ring-2 focus:ring-[#6B1420]/30"
                >
                  <option value="" disabled>Select...</option>
                  <option value="hospitality">Hospitality / Restaurants</option>
                  <option value="accommodation">Accommodation / Lodging</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="accounting">Accounting / Professional Services</option>
                  <option value="retail">Retail / E-commerce</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {status === 'error' && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={status === 'submitting'}
              size="lg"
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-[#6B1420] to-[#8B1A2A] text-base font-semibold text-white hover:from-[#5A1018] hover:to-[#7A1624] disabled:opacity-60"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Register My Interest
                  <Rocket className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-xs text-[#A8A9AD]">
              We'll only contact you about the launch. No spam, ever.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
