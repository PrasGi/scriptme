'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SectionTitle } from './section-title';
import { Check, Zap, Loader2, Rocket, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <section id="pricing" className="mt-32 flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section id="pricing" className="mt-32">
        <SectionTitle title="Pricing" description="Simple plans for every creator." />
        <p className="text-center text-gray-400 mt-6">No plans available.</p>
      </section>
    );
  }

  return (
    <section id="pricing" className="mt-32">
      <SectionTitle
        title="Simple pricing"
        description="Start free. Upgrade when you need more scripts and AI power."
      />

      <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
        {sortedPlans.map((item, index) => {
          const Icon = planIcons[item.slug] ?? Zap;
          const { price, period } = formatPrice(item);
          const mostPopular = item.slug === highlightSlug;
          const href =
            item.slug === 'enterprise' ? '/register?plan=enterprise' : `/register?plan=${item.slug}`;

          return (
            <motion.div
              key={item._id}
              className="group w-full max-w-80 glass p-6 rounded-xl hover:-translate-y-0.5 transition duration-300"
              initial={{ y: 150, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 320,
                damping: 70,
                mass: 1,
              }}
            >
              <div className="flex items-center w-max ml-auto text-xs gap-2 glass rounded-full px-3 py-1">
                <Icon className="size-3.5" />
                <span>{item.name}</span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-white">
                {price} <span className="text-sm font-normal text-white/70">{period}</span>
              </h3>
              <p className="text-gray-200 mt-3 text-sm">
                {item.slug === 'starter' && 'For getting started'}
                {item.slug === 'creator' && 'For serious creators'}
                {item.slug === 'enterprise' && 'For teams & agencies'}
              </p>
              <Link
                href={item.slug === 'enterprise' ? '#' : href}
                className={`mt-7 rounded-full w-full py-2.5 font-medium flex items-center justify-center gap-2 transition ${
                  mostPopular ? 'bg-white text-gray-800 hover:opacity-90' : 'btn-landing glass'
                }`}
              >
                {mostPopular && <Zap className="size-4" />}
                {item.cta}
              </Link>
              <div className="mt-6 flex flex-col">
                {getDisplayFeatures(item).slice(0, 6).map((feature) => (
                  <div key={feature} className="flex items-center gap-2 py-2">
                    <div className="rounded-full glass border-0 p-1">
                      <Check className="size-3 text-white" strokeWidth={3} />
                    </div>
                    <p className="text-sm text-white/90">{feature}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
