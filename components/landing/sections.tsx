import Link from 'next/link'
import {
  Users,
  Sparkles,
  Mail,
  Zap,
  Check,
  ArrowRight,
  MessageSquare,
  Cpu,
  Rocket,
  Building2,
  UtensilsCrossed,
  Bot,
  Brain,
  FileText,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QualificationCTA } from './qualification-cta'

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-48">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh-brand opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-crimson-500/15 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-crimson-400/30 bg-brand-crimson-500/10 px-4 py-1.5 text-sm text-brand-charcoal-100 backdrop-blur-sm">
          <Zap className="h-4 w-4 text-brand-crimson-400" />
          Built for South African Business Operations
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your AI-Powered{' '}
          <span className="gradient-text-brand">Business Operating System</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-brand-charcoal-200 sm:text-xl">
          Stop patching together tools. DraggonnB gives you a complete digital
          operations platform -- from guest bookings and staff management to AI
          agents that run your business around the clock.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="btn-brand h-12 rounded-xl px-8 text-base">
            <Link href="/qualify">
              Start Your Digital Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-brand-crimson-500/40 bg-transparent px-8 text-base text-brand-charcoal-100 hover:bg-brand-crimson-500/10 hover:text-white">
            <a href="#solutions">Explore Solutions</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof Bar                                                    */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '35+', label: 'Database Tables' },
  { value: '4', label: 'AI Agents Built' },
  { value: '72hr', label: 'Go-Live Time' },
  { value: 'R1,500', label: 'Starting From /mo' },
]

export function SocialProofBar() {
  return (
    <section className="border-y border-white/10 bg-brand-charcoal-800/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-brand-crimson-300 sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-sm text-brand-charcoal-300">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Problem / Solution                                                  */
/* ------------------------------------------------------------------ */

const painPoints = [
  {
    problem: 'Manual bookings, pricing spreadsheets, and scattered guest data',
    solution: 'Unified property management with variable pricing and guest portal',
  },
  {
    problem: 'Staff coordination via phone calls and WhatsApp chaos',
    solution: 'Structured Telegram/WhatsApp SOPs with automated task flows',
  },
  {
    problem: 'Expensive custom software that takes months to build',
    solution: 'Out-of-the-box industry modules, live in 72 hours',
  },
  {
    problem: 'No AI leverage -- your competitors are automating, you are not',
    solution: 'AI agents that qualify leads, generate proposals, and run operations',
  },
]

export function ProblemSolutionSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Stop Running Your Business on{' '}
            <span className="gradient-text-brand">Spreadsheets</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            South African businesses lose hours every week on manual processes. DraggonnB automates your operations end-to-end.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {painPoints.map((item, i) => (
            <div
              key={i}
              className="group rounded-xl border border-white/10 bg-brand-charcoal-800/50 p-6 transition-all hover-lift hover-glow-brand"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-crimson-500/20 text-xs text-brand-crimson-400">
                  X
                </div>
                <p className="text-brand-charcoal-300 line-through decoration-brand-charcoal-500">{item.problem}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-3.5 w-3.5 text-green-400" />
                </div>
                <p className="font-medium text-white">{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Module Showcase                                                     */
/* ------------------------------------------------------------------ */

const modules = [
  {
    icon: Users,
    title: 'CRM & Pipeline',
    description: 'Track contacts, companies, and deals. Automated lead nurture from WhatsApp intake to qualified opportunity.',
    gradient: 'from-brand-crimson-500 to-brand-crimson-700',
    tier: 'Core' as const,
  },
  {
    icon: Mail,
    title: 'Email Campaigns',
    description: 'Sequences, templates, behavioral triggers, A/B testing, and smart segmentation. Full email operations.',
    gradient: 'from-brand-crimson-600 to-brand-crimson-800',
    tier: 'Core' as const,
  },
  {
    icon: Building2,
    title: 'Accommodation',
    description: '35-table schema covering inventory, variable pricing, bookings, payments, operations, guest experience.',
    gradient: 'from-brand-crimson-400 to-brand-gold-500',
    tier: 'Growth' as const,
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurant & Events',
    description: 'POS integration, kitchen SOPs, food temp scanning, events coordination, and booking management.',
    gradient: 'from-brand-gold-500 to-brand-crimson-500',
    tier: 'Growth' as const,
  },
  {
    icon: Sparkles,
    title: 'Content Studio',
    description: 'AI content generation for social, email, and web. Autopilot mode generates and schedules weekly content.',
    gradient: 'from-brand-crimson-500 to-brand-charcoal-500',
    tier: 'Growth' as const,
  },
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'LeadQualifier, ProposalGenerator, ClientOnboarding, BusinessAutopilot. Agents that run your business 24/7.',
    gradient: 'from-brand-crimson-400 to-brand-crimson-600',
    tier: 'Scale' as const,
  },
]

const tierBadgeStyles = {
  Core: 'bg-brand-charcoal-600/50 text-brand-charcoal-200',
  Growth: 'bg-brand-crimson-500/20 text-brand-crimson-300',
  Scale: 'bg-brand-gold-500/20 text-brand-gold-400',
}

export function ModuleShowcaseSection() {
  return (
    <section id="modules" className="border-t border-white/10 bg-brand-charcoal-800/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Modular by <span className="gradient-text-brand">Design</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            Pick the modules your business needs. Each one is production-ready, AI-enhanced, and built for South African operations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.title}
                className="group relative rounded-xl border border-white/10 bg-brand-charcoal-800/60 p-6 transition-all hover-lift hover-glow-brand"
              >
                <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${tierBadgeStyles[mod.tier]}`}>
                  {mod.tier}
                </span>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${mod.gradient} shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{mod.title}</h3>
                <p className="text-sm leading-relaxed text-brand-charcoal-300">{mod.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Agents                                                          */
/* ------------------------------------------------------------------ */

const agentSteps = [
  { icon: MessageSquare, label: 'Lead comes in via WhatsApp', color: 'text-green-400' },
  { icon: Brain, label: 'LeadQualifier scores & routes', color: 'text-brand-crimson-400' },
  { icon: FileText, label: 'ProposalGenerator builds proposal', color: 'text-brand-crimson-300' },
  { icon: Rocket, label: 'ClientOnboarding activates platform', color: 'text-brand-gold-400' },
  { icon: Repeat, label: 'BusinessAutopilot runs operations', color: 'text-brand-crimson-400' },
]

export function AIAgentsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text */}
          <div>
            <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
              AI Agents That{' '}
              <span className="gradient-text-brand">Never Sleep</span>
            </h2>
            <p className="mb-8 text-lg text-brand-charcoal-300">
              Your business runs 24/7. Our AI agents handle lead qualification, proposal generation,
              client onboarding, and daily operations -- across WhatsApp, Telegram, and email.
            </p>

            <ul className="space-y-4">
              {[
                { name: 'LeadQualifier', desc: 'Scores leads on fit, urgency, and size. Recommends tier.' },
                { name: 'ProposalGenerator', desc: 'Creates custom proposals with pain points, solutions, pricing.' },
                { name: 'ClientOnboarding', desc: 'Generates content calendars, email templates, automation playbooks.' },
                { name: 'BusinessAutopilot', desc: 'Runs weekly content and email operations autonomously.' },
              ].map((agent) => (
                <li key={agent.name} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-crimson-500/20">
                    <Check className="h-3 w-3 text-brand-crimson-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">{agent.name}</span>
                    <span className="text-brand-charcoal-300"> -- {agent.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Agent Pipeline Visual */}
          <div className="relative flex flex-col items-center">
            {agentSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="relative flex w-full max-w-sm items-center gap-4">
                  {/* Connector line */}
                  {i < agentSteps.length - 1 && (
                    <div className="absolute left-6 top-14 h-8 w-px bg-gradient-to-b from-brand-crimson-500/50 to-transparent" />
                  )}

                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-brand-charcoal-800">
                    <Icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <div className="rounded-lg border border-white/10 bg-brand-charcoal-800/60 px-4 py-3 text-sm text-brand-charcoal-100">
                    {step.label}
                  </div>

                  {/* Spacer between steps */}
                  {i < agentSteps.length - 1 && <div className="h-8" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                        */
/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: MessageSquare,
    number: '01',
    title: 'Tell Us About Your Business',
    description:
      'Share your industry, team size, and biggest operational challenges. Our AI analyzes your needs in minutes.',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Get Your Custom Operating System',
    description:
      'AI matches your needs to our module library and proposes a complete solution -- accommodation, CRM, AI agents, and more.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Go Live in 72 Hours',
    description:
      'Your platform is provisioned automatically: isolated database, custom config, AI agents activated, staff channels connected.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-white/10 bg-brand-charcoal-800/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            From Conversation to{' '}
            <span className="gradient-text-brand">Operating System in 72 Hours</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            Three simple steps from your business challenges to a fully automated solution.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 md:block">
                    <div className="h-px w-full bg-gradient-to-r from-brand-crimson-500/50 to-transparent" />
                  </div>
                )}

                <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-crimson-500/20 to-brand-crimson-700/20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-brand-charcoal-800">
                    <Icon className="h-8 w-8 text-brand-crimson-400" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-crimson-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-brand-charcoal-300">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing Preview                                                     */
/* ------------------------------------------------------------------ */

const tiers = [
  {
    id: 'core',
    name: 'Core',
    price: 'R1,500',
    description: 'CRM, email, and one custom automation for businesses getting started.',
    highlights: [
      'CRM with deals pipeline',
      'Full email campaigns & sequences',
      '1 business automation',
      '50 AI content generations/mo',
    ],
    modulePills: ['CRM', 'Email'],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R3,500',
    description: 'Add accommodation, content studio, and smart lead pipeline.',
    highlights: [
      'Everything in Core, plus:',
      'Accommodation module (35 tables)',
      'AI content for all channels',
      'Smart lead pipeline + A/B testing',
      '200 AI generations/mo, 5 users',
    ],
    modulePills: ['CRM', 'Email', 'Accommodation', 'Content', 'Social'],
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 'R7,500',
    description: 'White label, AI agents, unlimited everything. For operators and agencies.',
    highlights: [
      'Everything in Growth, plus:',
      'White label (your domain & brand)',
      '3 AI agents (1,000 invocations/mo)',
      'API access + custom integrations',
      'Unlimited everything',
    ],
    modulePills: ['All Modules', 'AI Agents', 'White Label', 'API'],
    popular: false,
  },
]

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Transparent Pricing,{' '}
            <span className="gradient-text-brand">Powerful Modules</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-brand-charcoal-300">
            All plans include a 14-day free trial. No credit card required. Pay in Rands.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-xl border p-8 transition-all hover-lift ${
                tier.popular
                  ? 'border-brand-crimson-500/50 bg-brand-charcoal-800 shadow-lg shadow-brand-crimson-500/10'
                  : 'border-white/10 bg-brand-charcoal-800/60'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-gradient-to-r from-brand-crimson-600 to-brand-crimson-500 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="mb-1 text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mb-4 text-sm text-brand-charcoal-300">{tier.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="ml-1 text-brand-charcoal-300">/month</span>
              </div>

              <ul className="mb-4 flex-1 space-y-3">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-brand-charcoal-200">
                    <Check className="h-4 w-4 shrink-0 text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mb-6 flex flex-wrap gap-1.5">
                {tier.modulePills.map((pill) => (
                  <span key={pill} className="rounded bg-brand-charcoal-700 px-2 py-0.5 text-xs text-brand-charcoal-200">
                    {pill}
                  </span>
                ))}
              </div>

              <Button
                asChild
                variant={tier.popular ? 'default' : 'outline'}
                size="lg"
                className={`w-full rounded-lg ${
                  tier.popular
                    ? 'btn-brand'
                    : 'border-brand-charcoal-500 bg-transparent text-brand-charcoal-100 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Link href={`/qualify?tier=${tier.id}`}>Get Started</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-brand-charcoal-400">
          Need something custom?{' '}
          <Link href="/pricing" className="text-brand-crimson-400 underline-offset-4 hover:underline">
            View full feature comparison
          </Link>
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Trust / CTA                                                         */
/* ------------------------------------------------------------------ */

export function CTASection() {
  return <QualificationCTA />
}
