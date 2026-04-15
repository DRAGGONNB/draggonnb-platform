import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/nav'
import {
  HeroSection,
  ModuleShowcaseSection,
  HowItWorksSection,
  PricingPreviewSection,
  CTASection,
} from '@/components/landing/sections'
import { IndustrySolutionsSection } from '@/components/landing/industry-solutions'
import { RegisterInterestSection } from '@/components/landing/register-interest'
import { LandingFooter } from '@/components/landing/footer'

export default function Home({
  searchParams,
}: {
  searchParams: { error?: string; error_code?: string; error_description?: string }
}) {
  // Handle Supabase auth errors (e.g. expired password reset links)
  if (searchParams.error === 'access_denied' || searchParams.error_code === 'otp_expired') {
    const message = searchParams.error_description?.replace(/\+/g, ' ') || 'Link expired'
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`)
  }

  return (
    <div className="min-h-screen bg-[#363940] text-white">
      <LandingNav />
      <main>
        <HeroSection />
        <ModuleShowcaseSection />
        <HowItWorksSection />
        <IndustrySolutionsSection />
        <PricingPreviewSection />
        <RegisterInterestSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
