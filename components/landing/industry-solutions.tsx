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
  },
  {
    icon: Hotel,
    title: 'Hospitality',
    description:
      'Purpose-built accommodation module with property inventory, guest management, inquiry pipeline, and booking operations for lodges and guest houses.',
  },
  {
    icon: Home,
    title: 'Real Estate',
    description:
      'Track property listings, manage buyer and seller pipelines, automate showing follow-ups, and send targeted campaigns to your prospect database.',
  },
  {
    icon: Briefcase,
    title: 'Professional Services',
    description:
      'From consulting to legal, manage client relationships, automate proposals, track billable engagements, and nurture leads through your pipeline.',
  },
  {
    icon: ShoppingBag,
    title: 'Retail',
    description:
      'Build customer loyalty with targeted email campaigns, social media scheduling, and AI-generated content that drives repeat purchases.',
  },
  {
    icon: HeartPulse,
    title: 'Healthcare',
    description:
      'Patient communication, appointment follow-ups, and practice marketing. Automate patient engagement while maintaining a professional, caring presence.',
  },
]

export function IndustrySolutionsSection() {
  return (
    <section id="industries" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B1420]">
            Industry Solutions
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-[#363940] lg:text-4xl">
            Built for{' '}
            <span className="gradient-text-brand">Your Industry</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#A8A9AD]">
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
                className="group rounded-2xl border border-[#C0C1C4]/50 bg-white p-6 shadow-md transition-all hover:shadow-lg hover:border-[#6B1420]/30"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6B1420]/10">
                  <Icon className="h-6 w-6 text-[#6B1420]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#363940]">{industry.title}</h3>
                <p className="text-sm leading-relaxed text-[#A8A9AD]">{industry.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
