'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Receipt, Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#8B949E] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

interface Transaction {
  _id: string;
  userId: { _id: string; name: string; email: string };
  planId: { _id: string; name: string; slug: string };
  months: number;
  amountIdr: number;
  discountPercent: number;
  voucherCode: string | null;
  voucherDiscountIdr: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TransactionsPage() {
  const { hasPermission } = usePermissions();
  const canComplete = hasPermission('role', 'update', 'all');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [completing, setCompleting] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Transaction | null>(null);
  const LIMIT = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/admin/transactions?${params}`);
    const json = await res.json();
    if (json.success) {
      setTransactions(json.data.transactions ?? []);
      setTotal(json.data.pagination?.total ?? 0);
      setPages(json.data.pagination?.pages ?? 1);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  async function handleComplete(tx: Transaction) {
    if (!canComplete || tx.status !== 'pending') return;
    setCompleting(tx._id);
    const res = await fetch(`/api/admin/transactions/${tx._id}/complete`, { method: 'POST' });
    const json = await res.json();
    setCompleting(null);
    if (json.success) {
      setCompleteTarget(null);
      fetchTransactions();
    }
  }

  function statusBadge(s: string) {
    if (s === 'completed') return <Badge variant="green">Completed</Badge>;
    if (s === 'pending') return <Badge variant="orange">Pending</Badge>;
    if (s === 'failed') return <Badge variant="red">Failed</Badge>;
    if (s === 'cancelled') return <Badge variant="default">Cancelled</Badge>;
    return <Badge variant="default">{s}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt size={22} className="text-[#06B6D4]" />
          Transactions
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">View and complete pending transactions</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-[#8B949E]">Filter:</span>
        {['', 'pending', 'completed', 'failed'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40'
                : 'text-[#8B949E] hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Months</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-[#8B949E]">Loading…</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-[#8B949E]">No transactions</td></tr>
            ) : transactions.map((tx) => (
              <tr key={tx._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <div>
                    <div className="font-medium text-white">{(tx.userId as { name?: string }).name ?? '—'}</div>
                    <div className="text-xs text-[#8B949E]">{(tx.userId as { email?: string }).email ?? ''}</div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[#8B949E]">{(tx.planId as { name?: string }).name ?? '—'}</td>
                <td className="px-5 py-3.5 text-[#8B949E]">{tx.months} mo</td>
                <td className="px-5 py-3.5 text-white font-medium">{formatRp(tx.amountIdr)}</td>
                <td className="px-5 py-3.5">{statusBadge(tx.status)}</td>
                <td className="px-5 py-3.5 text-[#8B949E] text-xs">{formatDate(tx.createdAt)}</td>
                <td className="px-5 py-3.5">
                  {canComplete && tx.status === 'pending' && (
                    <Button
                      variant="cyan"
                      size="sm"
                      className="gap-1"
                      disabled={!!completing}
                      onClick={() => setCompleteTarget(tx)}
                    >
                      {completing === tx._id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Complete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-[#8B949E]">Page {page} of {pages} · {total} total</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {completeTarget && (
        <Modal title="Set Completed" onClose={() => setCompleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#8B949E]">
              Mark this transaction as completed?
            </p>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
              <div className="text-white font-medium">{(completeTarget.userId as { name?: string }).name ?? '—'}</div>
              <div className="text-[#8B949E]">{(completeTarget.planId as { name?: string }).name ?? '—'} · {formatRp(completeTarget.amountIdr)}</div>
              <div className="text-xs text-[#8B949E] mt-1">{formatDate(completeTarget.createdAt)}</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCompleteTarget(null)}>Cancel</Button>
              <Button
                variant="cyan"
                disabled={completing === completeTarget._id}
                onClick={() => handleComplete(completeTarget)}
              >
                {completing === completeTarget._id ? (
                  <><Loader2 size={14} className="animate-spin" /> Completing…</>
                ) : (
                  'Set Completed'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
