import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 via-[#0B0E14] to-[#A855F7]/10 p-12 text-center">
          {/* Blobs */}
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[#7C3AED]/10 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#A855F7]/10 blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
              <Sparkles className="h-4 w-4 text-[#7C3AED]" />
              <span className="text-sm text-[#8B949E]">Limited time — 7 days free on Creator plan</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Ready to write scripts
              <br />
              <span className="gradient-text">that actually convert?</span>
            </h2>
            <p className="text-lg text-[#8B949E] max-w-xl mx-auto">
              Join 12,000+ creators using ScriptMe to produce better video content, faster.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link href="/register">
                <Button variant="primary" size="lg" className="gap-2 text-base px-8">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="text-xs text-[#8B949E]/70">
              No credit card required • Cancel anytime • Free forever plan available
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
