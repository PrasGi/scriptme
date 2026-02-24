'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, PenLine, TrendingUp } from 'lucide-react';

export function LandingHero() {
  const [url, setUrl] = useState('');

  return (
    <section className="relative min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#7C3AED]/15 blur-[120px] animate-blob" />
        <div className="absolute bottom-[20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-[#2563EB]/12 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute top-[50%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#6366F1]/10 blur-[80px] animate-blob animation-delay-4000" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 container mx-auto max-w-5xl">
        {/* Top: centered copy — ~45% of hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Sparkles className="h-4 w-4 text-[#A78BFA]" />
            <span className="text-sm font-medium text-[#8B949E]">
              AI-Powered Script Writer & Optimizer
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] text-white mb-5">
            Generate, Analyze &{' '}
            <span className="gradient-text">Refine Your Script</span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl text-[#8B949E] font-semibold">
              with AI Intelligence
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-xl mx-auto mb-6 mt-8">
            <input
              type="url"
              placeholder="Paste a TikTok URL to clone its style..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 h-12 sm:h-12 px-4 rounded-xl bg-white/[0.06] border-0 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:ring-offset-0"
            />
            <Link href={url ? `/register?url=${encodeURIComponent(url)}` : '/register'} className="sm:shrink-0">
              <Button size="lg" className="w-full sm:w-auto h-12 px-6 text-base font-semibold rounded-xl bg-white text-black hover:bg-white/90 transition-all gap-2">
                Clone Style
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-[#8B949E]/80 mb-10">TikTok • No credit card required</p>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: PenLine, label: 'Generate', sub: 'AI writes your script' },
              { icon: TrendingUp, label: 'Analyze', sub: 'Per-line suggestions' },
              { icon: Sparkles, label: 'Clone', sub: "Creator's voice" },
            ].map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C3AED]/20">
                  <item.icon className="h-4 w-4 text-[#A78BFA]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <div className="text-xs text-[#8B949E]">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
