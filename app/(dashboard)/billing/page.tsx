'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Zap, BarChart2, ArrowRight, Loader2, FileDown } from 'lucide-react';
import { getDisplayFeatures } from '@/lib/plan-features';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number | null;
  tokenLimitMonthly: number | null;
  features: string[];
  cta: string;
  badge: string | null;
}

interface Subscription {
  _id: string;
  planId: { _id: string; name: string; slug: string };
  endsAt: string;
  source: string;
}

interface Transaction {
  _id: string;
  planId: { name: string; slug?: string };
  months: number;
  amountIdr: number;
  status: string;
  createdAt: string;
}

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<{ subscription: Subscription | null; plan: Plan | null } | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function downloadInvoice(tx: Transaction) {
    const txId = String(tx._id ?? '').trim();
    if (!txId) return;
    setDownloadingId(tx._id);
    try {
      const res = await fetch(`/api/billing/invoice/${txId}`, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${(tx.planId as { slug?: string })?.slug ?? 'script'}-${tx._id.slice(-8)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } finally {
      setDownloadingId(null);
    }
  }

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [subRes, usageRes, plansRes, txRes] = await Promise.all([
          fetch('/api/billing/subscription'),
          fetch('/api/billing/usage'),
          fetch('/api/plans'),
          fetch('/api/billing/transactions?limit=10'),
        ]);
        const subJson = await subRes.json();
        const usageJson = await usageRes.json();
        const plansJson = await plansRes.json();
        const txJson = await txRes.json();
        if (subJson.success) setSubscription(subJson.data);
        if (usageJson.success) setUsage(usageJson.data);
        if (plansJson.success) setPlans(plansJson.data ?? []);
        if (txJson.success) setTransactions(txJson.data?.transactions ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const sub = subscription?.subscription;
  const plan = subscription?.plan;
  const planSlug = sub?.planId?.slug ?? plan?.slug ?? 'starter';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Manage your subscription, usage and invoices</p>
      </div>

      {/* Current plan banner */}
      <div className="rounded-2xl border border-[#06B6D4]/25 bg-[#06B6D4]/06 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#06B6D4]/20 flex items-center justify-center text-[#06B6D4] flex-shrink-0">
          <Zap size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-white">{plan?.name ?? 'Starter'}</h2>
            <Badge variant="cyan">Active</Badge>
          </div>
          <p className="text-sm text-[#8B949E]">
            {sub?.endsAt
              ? <>Plan ends <span className="text-white">{formatDate(sub.endsAt)}</span></>
              : <>Free plan · upgrade anytime</>
            }
            {plan?.priceMonthly != null && plan.priceMonthly > 0 && (
              <> · {formatRp(plan.priceMonthly)}/month</>
            )}
          </p>
        </div>
        {planSlug !== 'enterprise' && plan?.slug !== 'enterprise' && (
          <Link href="/billing/upgrade?plan=creator">
            <Button variant="cyan" size="sm" className="gap-1.5">
              <ArrowRight size={14} />
              Upgrade
            </Button>
          </Link>
        )}
      </div>

      {/* Usage */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">AI Token Usage This Month</h2>
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#06B6D4]/15 text-[#06B6D4]">
              <BarChart2 size={15} />
            </div>
            <span className="text-sm text-[#8B949E]">Tokens used</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-white">{usage?.used ?? 0}</span>
            <span className="text-sm text-[#8B949E] mb-0.5">
              / {usage?.limit != null ? usage.limit.toLocaleString() : '∞'}
            </span>
          </div>
          {usage?.limit != null && (
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-[#06B6D4]"
                style={{ width: `${Math.min(100, ((usage.used ?? 0) / usage.limit) * 100)}%` }}
              />
            </div>
          )}
          {usage?.limit == null && (
            <div className="text-xs text-[#06B6D4]">Unlimited on your plan</div>
          )}
        </Card>
      </div>

      {/* Plans comparison */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = p.slug === planSlug;
            const accent = p.slug === 'creator' ? '#06B6D4' : p.slug === 'enterprise' ? '#A855F7' : '#8B949E';
            const priceDisplay = p.priceMonthly === 0
              ? 'Free' : p.priceMonthly == null ? 'Custom' : formatRp(p.priceMonthly);
            return (
              <div
                key={p._id}
                className="rounded-2xl border p-5 transition-all"
                style={{
                  borderColor: isCurrent ? `${accent}30` : 'rgba(255,255,255,0.06)',
                  background: isCurrent ? `${accent}06` : '#161B22',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  {isCurrent && <Badge variant="cyan">Current Plan</Badge>}
                  {p.badge && !isCurrent && <Badge variant="cyan">{p.badge}</Badge>}
                </div>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-white">{priceDisplay}</span>
                  {p.priceMonthly != null && p.priceMonthly > 0 && <span className="text-xs text-[#8B949E]">/month</span>}
                </div>
                <ul className="space-y-2 mb-5">
                  {getDisplayFeatures(p).slice(0, 5).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#8B949E]">
                      <Check size={12} style={{ color: accent }} className="flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.slug === 'enterprise' ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    {p.cta}
                  </Button>
                ) : p.slug === 'starter' && (planSlug === 'creator' || planSlug === 'enterprise') ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    {p.cta}
                  </Button>
                ) : (
                  <Link href={`/billing/upgrade?plan=${p.slug}`}>
                    <Button
                      variant={isCurrent ? 'secondary' : 'outline'}
                      size="sm"
                      className="w-full"
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Current Plan' : p.cta}
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Transaction History</h2>
        <div className="rounded-2xl border border-white/[0.06] bg-[#161B22] overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-white/[0.04] text-xs text-[#8B949E] font-medium">
            <span>Plan</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Invoice</span>
          </div>
          {transactions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#8B949E]">No transactions yet</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx._id}
                className="grid grid-cols-5 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors last:border-0 items-center"
              >
                <span className="text-sm text-white">{(tx.planId as { name?: string }).name} ({tx.months} mo)</span>
                <span className="text-sm text-[#8B949E]">{formatDate(tx.createdAt)}</span>
                <span className="text-sm text-white font-medium">{formatRp(tx.amountIdr)}</span>
                <div>
                  <Badge variant={tx.status === 'completed' ? 'green' : tx.status === 'pending' ? 'orange' : 'default'}>
                    {tx.status}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => downloadInvoice(tx)}
                    disabled={downloadingId === tx._id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-colors disabled:opacity-50"
                  >
                    {downloadingId === tx._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileDown size={14} />
                    )}
                    PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
