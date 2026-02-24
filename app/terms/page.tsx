import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — ScriptMe',
  description: 'Terms of Service for ScriptMe. Read our terms and conditions for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white dark">
      <LandingNavbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-[#8B949E] mb-12">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[#E6EDF3]">
          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#8B949E] leading-relaxed">
              By accessing or using ScriptMe, you agree to be bound by these Terms of Service. If you do not agree,
              please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Description of Service</h2>
            <p className="text-[#8B949E] leading-relaxed">
              ScriptMe provides AI-powered tools for creating, analyzing, and optimizing video scripts. We reserve
              the right to modify, suspend, or discontinue any part of the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Your Responsibilities</h2>
            <p className="text-[#8B949E] leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and for all activities under your
              account. You agree not to use the service for any unlawful purpose or in violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Intellectual Property</h2>
            <p className="text-[#8B949E] leading-relaxed">
              You retain ownership of the content you create. By using our service, you grant us a limited license to
              process your content for the purpose of providing our services. ScriptMe&apos;s platform, design, and
              technology remain our property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Subscription & Payment</h2>
            <p className="text-[#8B949E] leading-relaxed">
              Paid subscriptions are billed according to the plan you choose. Fees are non-refundable except as required
              by law or as stated in our refund policy. We may change pricing with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Limitation of Liability</h2>
            <p className="text-[#8B949E] leading-relaxed">
              ScriptMe is provided &quot;as is.&quot; We are not liable for any indirect, incidental, or consequential
              damages arising from your use of the service. Our total liability is limited to the amount you paid us in
              the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. Contact</h2>
            <p className="text-[#8B949E] leading-relaxed">
              For questions about these Terms of Service, please contact us at support@scriptminder.com.
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
