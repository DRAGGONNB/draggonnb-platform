import { LandingNav } from '@/components/landing/nav'
import {
  HeroSection,
  ModuleShowcaseSection,
  HowItWorksSection,
  SocialProofSection,
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
        <ModuleShowcaseSection />
        <HowItWorksSection />
        <IndustrySolutionsSection />
        <SocialProofSection />
        <PricingPreviewSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
