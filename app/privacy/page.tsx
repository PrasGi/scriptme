import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — ScriptMe',
  description: 'Privacy Policy for ScriptMe. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8B949E] mb-12">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="space-y-8 text-[#E6EDF3]">
          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Information We Collect</h2>
            <p className="text-[#8B949E] leading-relaxed">
              We collect information you provide directly, such as when you create an account, use our services, or contact us.
              This may include your name, email address, payment information, and the content you create (scripts, projects).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. How We Use Your Information</h2>
            <p className="text-[#8B949E] leading-relaxed">
              We use your information to provide, maintain, and improve our services; to process transactions; to send
              you updates and support; and to protect the security of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Data Storage & Security</h2>
            <p className="text-[#8B949E] leading-relaxed">
              Your data is stored securely using industry-standard practices. We take reasonable measures to protect
              your personal information from unauthorized access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Third-Party Services</h2>
            <p className="text-[#8B949E] leading-relaxed">
              We may use third-party services for authentication, payments, and AI features. These services have their
              own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Your Rights</h2>
            <p className="text-[#8B949E] leading-relaxed">
              You have the right to access, correct, or delete your personal data. You may also export your data or
              request account deletion by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Contact Us</h2>
            <p className="text-[#8B949E] leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at privacy@scriptminder.com.
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
