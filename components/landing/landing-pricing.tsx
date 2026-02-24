'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Zap, Loader2, Rocket, Crown } from 'lucide-react';
import { getDisplayFeatures } from '@/lib/plan-features';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number | null;
  features: string[];
  cta: string;
  badge: string | null;
  order: number;
}

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: Rocket,
  creator: Zap,
  enterprise: Crown,
};

function formatPrice(p: Plan) {
  if (p.priceMonthly === 0) return { price: 'Free', period: '' };
  if (p.priceMonthly == null) return { price: 'Custom', period: '' };
  return {
    price: `Rp ${p.priceMonthly.toLocaleString('id-ID')}`,
    period: '/month',
  };
}

export function LandingPricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setPlans(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedPlans = [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const highlightSlug = sortedPlans.find((p) => p.badge === 'Most Popular')?.slug ?? 'creator';

  if (loading) {
    return (
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-black flex justify-center">
        <Loader2 size={28} className="animate-spin text-[#A78BFA]" />
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple pricing</h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">Simple plans for every creator.</p>
        </div>
        <p className="text-center text-[#8B949E]">No plans available.</p>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Simple pricing
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            Start free. Upgrade when you need more scripts and AI power.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {sortedPlans.map((item) => {
            const Icon = planIcons[item.slug] ?? Zap;
            const { price, period } = formatPrice(item);
            const mostPopular = item.slug === highlightSlug;
            const href =
              item.slug === 'enterprise' ? '/register?plan=enterprise' : `/register?plan=${item.slug}`;

            return (
              <div
                key={item._id}
                className="w-full max-w-80 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="flex items-center w-max ml-auto text-xs gap-2 rounded-full px-3 py-1 bg-white/[0.04] border border-white/[0.06]">
                  <Icon className="size-3.5 text-[#A78BFA]" />
                  <span className="text-white/90">{item.name}</span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {price} <span className="text-sm font-normal text-white/70">{period}</span>
                </h3>
                <p className="text-[#8B949E] mt-3 text-sm">
                  {item.slug === 'starter' && 'For getting started'}
                  {item.slug === 'creator' && 'For serious creators'}
                  {item.slug === 'enterprise' && 'For teams & agencies'}
                </p>
                <Link
                  href={item.slug === 'enterprise' ? '#' : href}
                  className={`mt-7 rounded-xl w-full py-2.5 font-medium flex items-center justify-center gap-2 transition h-11 ${
                    mostPopular
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'border border-white/[0.15] bg-transparent text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {mostPopular && <Zap className="size-4" />}
                  {item.cta}
                </Link>
                <div className="mt-6 flex flex-col">
                  {getDisplayFeatures(item).slice(0, 6).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 py-2">
                      <div className="rounded-full p-1 bg-white/[0.06] border border-white/[0.06]">
                        <Check className="size-3 text-white" strokeWidth={3} />
                      </div>
                      <p className="text-sm text-white/90">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
