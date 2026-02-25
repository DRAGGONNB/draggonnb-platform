'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Loader2, Brain, Clock, Shield } from 'lucide-react'

export function QualificationCTA() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [challenge, setChallenge] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const inputClasses =
    'w-full rounded-lg border border-white/10 bg-brand-charcoal-900/50 px-4 py-3 text-white placeholder-brand-charcoal-400 transition-colors focus:border-brand-crimson-500 focus:outline-none focus:ring-2 focus:ring-brand-crimson-500/20'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company_name: companyName,
          business_issues: [challenge],
          source: 'landing_embed',
          honeypot,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      // Save to localStorage for prefill on qualify page
      try {
        localStorage.setItem('qualify_email', email)
        localStorage.setItem('qualify_company', companyName)
      } catch {
        // localStorage may not be available
      }

      router.push('/qualify?prefill=true')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh-brand opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-crimson-600/15 blur-[100px]" />

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-crimson-500 to-brand-crimson-700 shadow-lg">
            <Brain className="h-7 w-7 text-white" />
          </div>

          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Ready to Start Your{' '}
            <span className="gradient-text-brand">Digital Journey?</span>
          </h2>

          <p className="mx-auto mb-8 max-w-xl text-lg text-brand-charcoal-300">
            Tell us your biggest operational challenge. Our AI will show you exactly which modules solve it.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-auto mb-6 max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Inline form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-xl rounded-xl border border-white/10 bg-brand-charcoal-800/60 p-6 shadow-2xl backdrop-blur-sm sm:p-8"
        >
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
            <input
              type="text"
              required
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClasses}
            />
          </div>

          <textarea
            required
            rows={3}
            placeholder="Describe your biggest operational challenge -- what keeps you up at night?"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            className={inputClasses + ' mb-4 resize-none'}
          />

          {/* Honeypot */}
          <input
            type="text"
            name="website_url"
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="btn-brand h-12 w-full rounded-xl text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Start Your Digital Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-charcoal-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand-crimson-400" />
            AI-Powered Analysis
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand-crimson-300" />
            72-Hour Setup
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-green-500" />
            No Commitment
          </span>
        </div>
      </div>
    </section>
  )
}
