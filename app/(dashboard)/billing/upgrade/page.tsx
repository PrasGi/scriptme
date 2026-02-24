'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Zap, CreditCard } from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number | null;
  discount1Month: number;
  discount3Months: number;
  discount6Months: number;
  features: string[];
  cta: string;
  badge: string | null;
}

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function UpgradePageContent() {
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') ?? 'creator';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<1 | 3 | 6>(3);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discountIdr: number; finalAmountIdr: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const all = json.data ?? [];
          setPlans(all);
          const p = all.find((x: Plan) => x.slug === planSlug) ?? all[0];
          setPlan(p);
        }
      })
      .finally(() => setLoading(false));
  }, [planSlug]);

  const baseAmount =
    plan?.priceMonthly != null && plan.priceMonthly > 0
      ? Math.round(
          plan.priceMonthly *
            selectedMonths *
            (1 - (selectedMonths === 1 ? plan.discount1Month : selectedMonths === 3 ? plan.discount3Months : plan.discount6Months) / 100)
        )
      : 0;

  const displayAmount = appliedCoupon?.finalAmountIdr ?? baseAmount;
  const discountFromCoupon = appliedCoupon?.discountIdr ?? 0;

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError('');
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), planSlug, months: selectedMonths }),
      });
      const json = await res.json();
      if (json.success && json.data?.valid) {
        setAppliedCoupon({ discountIdr: json.data.discountIdr, finalAmountIdr: json.data.finalAmountIdr });
      } else {
        setAppliedCoupon(null);
        setCouponError(json.data?.reason ?? 'Invalid coupon');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function handlePay() {
    if (plan?.priceMonthly == null || plan.priceMonthly === 0) return;
    setPaying(true);
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, months: selectedMonths, couponCode: couponCode.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setTransactionId(json.data?.transactionId ?? null);
      }
    } finally {
      setPaying(false);
    }
  }

  if (loading || !plan) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (plan.priceMonthly == null || plan.priceMonthly === 0) {
    return (
      <div className="space-y-6">
        <Link href="/billing" className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-white">
          <ArrowLeft size={14} /> Back to Billing
        </Link>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117] p-8 text-center">
          <p className="text-[#8B949E]">Enterprise plan — contact us for custom pricing.</p>
          <Button variant="secondary" size="sm" className="mt-4" disabled>Contact Us (coming soon)</Button>
        </div>
      </div>
    );
  }

  if (transactionId) {
    return (
      <div className="space-y-6">
        <Link href="/billing" className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-white">
          <ArrowLeft size={14} /> Back to Billing
        </Link>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Xendit Payment — Coming Soon</h2>
          <p className="text-sm text-[#8B949E] mb-4">Payment integration will be embedded here.</p>
          <p className="text-xs text-[#8B949E] font-mono">Transaction ID: {transactionId}</p>
          <Link href="/billing"><Button variant="secondary" size="sm" className="mt-4">Back to Billing</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/billing" className="inline-flex items-center gap-2 text-sm text-[#8B949E] hover:text-white mb-4">
          <ArrowLeft size={14} /> Back to Billing
        </Link>
        <h1 className="text-2xl font-bold text-white">Upgrade — {plan.name}</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Select package and pay</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Package</h2>
          <div className="flex gap-2">
            {([1, 3, 6] as const).map((m) => {
              const discount = m === 1 ? plan.discount1Month : m === 3 ? plan.discount3Months : plan.discount6Months;
              const price = Math.round(plan.priceMonthly! * m * (1 - discount / 100));
              return (
                <button
                  key={m}
                  onClick={() => { setSelectedMonths(m); setAppliedCoupon(null); }}
                  className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                    selectedMonths === m
                      ? 'border-[#7C3AED]/40 bg-[#7C3AED]/10'
                      : 'border-white/[0.08] bg-[#161B22] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{m} month{m > 1 ? 's' : ''}</div>
                  <div className="text-xs text-[#8B949E] mt-0.5">
                    {discount > 0 ? `${discount}% off · ` : ''}{formatRp(price)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider block mb-2">Coupon</label>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); setAppliedCoupon(null); }}
                placeholder="WELCOME20"
                className="flex-1 bg-[#161B22] border-white/[0.08] font-mono uppercase"
              />
              <Button variant="secondary" size="sm" onClick={applyCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                {validatingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
              </Button>
            </div>
            {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
            {appliedCoupon && appliedCoupon.discountIdr > 0 && (
              <p className="text-xs text-emerald-400 mt-1">Coupon applied: -{formatRp(appliedCoupon.discountIdr)}</p>
            )}
          </div>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-[#7C3AED]" />
              Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#8B949E]">
                <span>{plan.name} — {selectedMonths} month{selectedMonths > 1 ? 's' : ''}</span>
                <span>{formatRp(baseAmount)}</span>
              </div>
              {discountFromCoupon > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon discount</span>
                  <span>-{formatRp(discountFromCoupon)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/[0.06]">
                <span>Total</span>
                <span>{formatRp(displayAmount)}</span>
              </div>
            </div>
            <Button
              variant="accent"
              size="lg"
              className="w-full mt-6 gap-2"
              disabled={paying || displayAmount <= 0}
              onClick={handlePay}
            >
              {paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              Pay {formatRp(displayAmount)}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <div className="py-4">
      <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 size={24} className="animate-spin text-[#7C3AED]" /></div>}>
        <UpgradePageContent />
      </Suspense>
    </div>
  );
}
