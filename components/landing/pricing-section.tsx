'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, Zap, Loader2 } from 'lucide-react';

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

function formatPrice(p: Plan) {
  if (p.priceMonthly === 0) return { price: 'Free', period: '' };
  if (p.priceMonthly == null) return { price: 'Custom', period: '' };
  return {
    price: `Rp ${p.priceMonthly.toLocaleString('id-ID')}`,
    period: '/month',
  };
}

export function PricingSection() {
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
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D1117]">
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D1117]">
        <div className="text-center text-[#8B949E] py-16">No plans available. Run seed to create plans.</div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D1117]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="orange" className="mx-auto">Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Simple, <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready. No surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {sortedPlans.map((plan) => {
            const { price, period } = formatPrice(plan);
            const highlight = plan.slug === highlightSlug;
            const href = plan.slug === 'enterprise' ? '/register?plan=enterprise' : `/register?plan=${plan.slug}`;
            const ctaVariant = highlight ? 'primary' : 'outline';
            return (
              <Card
                key={plan._id}
                noPadding
                className="relative overflow-hidden flex flex-col"
                style={highlight ? { borderColor: '#06B6D430', background: '#06B6D406' } : {}}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="cyan">{plan.badge}</Badge>
                  </div>
                )}
                <div className="p-6 flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    {period && <span className="text-sm text-[#8B949E]">{period}</span>}
                  </div>
                  <ul className="space-y-2.5">
                    {(plan.features ?? []).map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check size={14} className="text-[#06B6D4] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[#8B949E]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 pt-0">
                  {plan.slug === 'enterprise' ? (
                    <Button variant="outline" size="lg" className="w-full" disabled>
                      {plan.cta}
                    </Button>
                  ) : (
                    <Link href={href} className="block">
                      <Button variant={ctaVariant as 'primary' | 'outline'} size="lg" className="w-full">
                        {highlight && <Zap className="h-4 w-4" />}
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
