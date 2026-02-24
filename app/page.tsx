import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingWorkflow } from '@/components/landing/landing-workflow';
import { LandingSocialProof } from '@/components/landing/landing-social-proof';
import { LandingTestimonials } from '@/components/landing/landing-testimonials';
import { LandingFaq } from '@/components/landing/landing-faq';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingCta } from '@/components/landing/landing-cta';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white dark">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingWorkflow />
      <LandingSocialProof />
      <LandingTestimonials />
      <LandingFaq />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
