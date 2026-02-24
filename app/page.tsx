import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingWorkflow } from '@/components/landing/landing-workflow';
import { LandingTestimonials } from '@/components/landing/landing-testimonials';
import { LandingFaq } from '@/components/landing/landing-faq';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingCta } from '@/components/landing/landing-cta';

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <LandingNavbar />
      {/* Background: 3-color glow (purple, indigo, blue) */}
      <div className="fixed inset-0 overflow-hidden -z-20 pointer-events-none">
        <div className="absolute rounded-full top-80 left-2/5 -translate-x-1/2 w-[520px] h-[520px] bg-[#7C3AED] blur-[100px]" />
        <div className="absolute rounded-full top-80 right-0 -translate-x-1/2 w-[520px] h-[520px] bg-[#2563EB] blur-[100px]" />
        <div className="absolute rounded-full top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#6D28D9] blur-[100px]" />
      </div>
      <main className="px-4">
        <LandingHero />
        <LandingFeatures />
        <LandingWorkflow />
        <LandingTestimonials />
        <LandingFaq />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
