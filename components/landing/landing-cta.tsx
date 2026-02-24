'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingCta() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#7C3AED]/15 blur-[120px] animate-blob" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#2563EB]/12 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 container mx-auto max-w-3xl">
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-10 sm:p-12 lg:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Ready to write better scripts?
          </h2>
          <p className="text-lg text-[#8B949E] mb-8 max-w-lg mx-auto">
            Get started for free. No credit card required. Create your first script in minutes with AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link href="/register">
              <Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-8 text-base font-semibold rounded-xl transition-all gap-2">
                Try ScriptMe free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border border-white/[0.15] text-white hover:bg-white/[0.06] h-12 px-8 text-base font-medium rounded-xl">
                View features
              </Button>
            </a>
          </div>

          <p className="text-[#8B949E]/80 text-sm">
            AI-powered script writer and optimizer for content creators.
          </p>
        </div>
      </div>
    </section>
  );
}
