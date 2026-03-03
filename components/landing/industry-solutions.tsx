import {
  Calculator,
  Hotel,
  Home,
  Briefcase,
  ShoppingBag,
  HeartPulse,
} from 'lucide-react'

const industries = [
  {
    icon: Calculator,
    title: 'Accounting Firms',
    description:
      'Manage client portfolios, automate follow-ups during tax season, and streamline onboarding. Track deadlines and send automated reminders.',
    gradient: 'from-brand-crimson-500 to-brand-crimson-700',
  },
  {
    icon: Hotel,
    title: 'Hospitality',
    description:
      'Purpose-built accommodation module with property inventory, guest management, inquiry pipeline, and booking operations for lodges and guest houses.',
    gradient: 'from-brand-crimson-600 to-brand-crimson-800',
  },
  {
    icon: Home,
    title: 'Real Estate',
    description:
      'Track property listings, manage buyer and seller pipelines, automate showing follow-ups, and send targeted campaigns to your prospect database.',
    gradient: 'from-brand-gold-500 to-brand-crimson-500',
  },
  {
    icon: Briefcase,
    title: 'Professional Services',
    description:
      'From consulting to legal, manage client relationships, automate proposals, track billable engagements, and nurture leads through your pipeline.',
    gradient: 'from-brand-crimson-400 to-brand-crimson-600',
  },
  {
    icon: ShoppingBag,
    title: 'Retail',
    description:
      'Build customer loyalty with targeted email campaigns, social media scheduling, and AI-generated content that drives repeat purchases.',
    gradient: 'from-brand-crimson-500 to-brand-gold-500',
  },
  {
    icon: HeartPulse,
    title: 'Healthcare',
    description:
      'Patient communication, appointment follow-ups, and practice marketing. Automate patient engagement while maintaining a professional, caring presence.',
    gradient: 'from-brand-crimson-400 to-brand-gold-500',
  },
]

export function IndustrySolutionsSection() {
  return (
    <section id="industries" className="border-t border-white/10 bg-brand-charcoal-800/30 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-crimson-400">
            Industry Solutions
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-white lg:text-4xl">
            Built for{' '}
            <span className="gradient-text-brand">Your Industry</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            Whether you run a lodge, an accounting practice, or a retail business,
            DraggonnB adapts to how you work with industry-specific modules and workflows.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => {
            const Icon = industry.icon
            return (
              <div
                key={industry.title}
                className="group rounded-2xl border border-white/10 bg-brand-charcoal-800/60 p-6 transition-all hover-lift hover-glow-brand"
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${industry.gradient} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{industry.title}</h3>
                <p className="text-sm leading-relaxed text-brand-charcoal-300">{industry.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
