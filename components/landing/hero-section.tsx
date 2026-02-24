'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Zap, PlayCircle } from 'lucide-react';

export function HeroSection() {
  const [url, setUrl] = useState('');

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0B0E14]">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] animate-blob" />
        <div className="absolute bottom-[5%] left-[-10%] w-[450px] h-[450px] rounded-full bg-indigo-500/8 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute top-[50%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-400/8 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-100 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl w-full">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-sm font-medium text-[#8B949E]">
              AI-Powered Video Script Platform
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              <span className="text-white">Craft Winning</span>
              <br />
              <span className="gradient-text">Video Scripts</span>
              <br />
              <span className="text-[#8B949E] text-3xl sm:text-4xl md:text-5xl">
                with AI Intelligence
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[#8B949E] max-w-2xl mx-auto leading-relaxed">
              Generate, analyze, and perfect your video scripts. Clone any creator&apos;s writing style
              and produce content that drives engagement.
            </p>
          </div>

          {/* URL form */}
          <div className="w-full max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08]">
              <input
                type="url"
                placeholder="Paste a TikTok URL to clone its style..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-transparent"
              />
              <Link href={url ? `/register?url=${encodeURIComponent(url)}` : '/register'}>
                <Button variant="primary" size="lg" className="w-full sm:w-auto whitespace-nowrap">
                  Analyze Style
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-xs text-[#8B949E]/70">
              TikTok • No credit card required
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button variant="accent" size="lg" className="gap-2">
                <Zap className="h-4 w-4" />
                Start Free Today
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Social proof numbers */}
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            {[
              { value: '50K+', label: 'Scripts Created' },
              { value: '12K+', label: 'Active Creators' },
              { value: '98%', label: 'Satisfaction Rate' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-[#8B949E]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero mockup card */}
        <div className="mt-20 mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#161B22] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-xs text-[#8B949E]">ScriptMinder — dashboard</span>
            </div>
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              {[
                {
                  icon: '✍️',
                  title: 'Generate Script',
                  desc: 'AI writes a full video script from your topic or brief',
                  accent: 'text-[#7C3AED]',
                },
                {
                  icon: '🔍',
                  title: 'Analyze Script',
                  desc: 'Get engagement score, hook analysis and improvement tips',
                  accent: 'text-emerald-400',
                },
                {
                  icon: '🎭',
                  title: 'Clone Style',
                  desc: 'Mirror any creator\'s voice and apply it to your scripts',
                  accent: 'text-purple-400',
                },
              ].map((item) => (
                <div key={item.title} className="p-6 space-y-2">
                  <div className="text-2xl">{item.icon}</div>
                  <div className={`text-sm font-semibold ${item.accent}`}>{item.title}</div>
                  <div className="text-xs text-[#8B949E] leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
