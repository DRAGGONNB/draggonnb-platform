import { LandingNav } from '@/components/landing/nav'
import {
  HeroSection,
  SocialProofBar,
  ProblemSolutionSection,
  ModuleShowcaseSection,
  AIAgentsSection,
  HowItWorksSection,
  PricingPreviewSection,
  CTASection,
} from '@/components/landing/sections'
import { IndustrySolutionsSection } from '@/components/landing/industry-solutions'
import { LandingFooter } from '@/components/landing/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-charcoal-900 via-brand-charcoal-900 to-brand-charcoal-800 text-white">
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSolutionSection />
        <IndustrySolutionsSection />
        <ModuleShowcaseSection />
        <AIAgentsSection />
        <HowItWorksSection />
        <PricingPreviewSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
