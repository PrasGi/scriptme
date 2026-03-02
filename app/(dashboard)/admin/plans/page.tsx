'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { CreditCard, Plus, Edit2, Trash2, X, AlertTriangle, Sparkles } from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number | null;
  discount1Month: number;
  discount3Months: number;
  discount6Months: number;
  tokenLimitMonthly: number | null;
  features: string[];
  cta: string;
  badge: string | null;
  isActive: boolean;
  order: number;
  limitProjectCreate?: number | null;
  limitSave?: number | null;
  limitExport?: number | null;
  limitAnalyze?: number | null;
  limitFetch?: number | null;
  limitReadMode?: number | null;
  limitCharacterCreate?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const ACTION_LIMIT_KEYS: { key: 'limitProjectCreate' | 'limitSave' | 'limitExport' | 'limitAnalyze' | 'limitFetch' | 'limitReadMode' | 'limitCharacterCreate'; label: string }[] = [
  { key: 'limitProjectCreate', label: 'Create project' },
  { key: 'limitSave', label: 'Create script' },
  { key: 'limitExport', label: 'Export' },
  { key: 'limitAnalyze', label: 'Analyze' },
  { key: 'limitFetch', label: 'Fetch TikTok' },
  { key: 'limitReadMode', label: 'Read mode' },
  { key: 'limitCharacterCreate', label: 'Create / clone character' },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-300/30 flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function formatRp(n: number | null) {
  if (n == null) return 'Custom';
  if (n === 0) return 'Gratis';
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function PlansPage() {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('role', 'update', 'all');
  const canDelete = hasPermission('role', 'delete', 'all');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    priceMonthly: 0,
    discount1Month: 0,
    discount3Months: 0,
    discount6Months: 0,
    tokenLimitMonthly: 0,
    features: '',
    cta: '',
    badge: '',
  isActive: true,
  order: 0,
  limitProjectCreate: '' as '' | number,
  limitSave: '' as '' | number,
    limitExport: '' as '' | number,
    limitAnalyze: '' as '' | number,
    limitFetch: '' as '' | number,
    limitReadMode: '' as '' | number,
  limitCharacterCreate: '' as '' | number,
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/plans');
    const json = await res.json();
    if (json.success) setPlans(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function openCreate() {
    setForm({
      name: '', slug: '', priceMonthly: 0, discount1Month: 0, discount3Months: 0, discount6Months: 0,
      tokenLimitMonthly: 0, features: '', cta: 'Start Free', badge: '', isActive: true, order: 0,
      limitProjectCreate: '', limitSave: '', limitExport: '', limitAnalyze: '', limitFetch: '', limitReadMode: '', limitCharacterCreate: '',
    });
    setError('');
    setCreateOpen(true);
  }

  function openEdit(p: Plan) {
    setForm({
      name: p.name,
      slug: p.slug,
      priceMonthly: p.priceMonthly ?? 0,
      discount1Month: p.discount1Month ?? 0,
      discount3Months: p.discount3Months ?? 0,
      discount6Months: p.discount6Months ?? 0,
      tokenLimitMonthly: p.tokenLimitMonthly ?? 0,
      features: (p.features ?? []).join('\n'),
      cta: p.cta ?? '',
      badge: p.badge ?? '',
      isActive: p.isActive ?? true,
      order: p.order ?? 0,
      limitProjectCreate: p.limitProjectCreate ?? '',
      limitSave: p.limitSave ?? '',
      limitExport: p.limitExport ?? '',
      limitAnalyze: p.limitAnalyze ?? '',
      limitFetch: p.limitFetch ?? '',
      limitReadMode: p.limitReadMode ?? '',
      limitCharacterCreate: p.limitCharacterCreate ?? '',
    });
    setError('');
    setEditTarget(p);
  }

  /** Generate feature lines from current action limits (number = "X/month", else "Unlimited"). Fills the Features text area; admin can edit before save. */
  function generateFeaturesFromLimits() {
    const lines = ACTION_LIMIT_KEYS.map(({ key, label }) => {
      const v = form[key];
      const num = typeof v === 'number' ? v : (v === '' ? null : Number(v));
      const text = num != null && Number.isFinite(num) && num > 0 ? `${label}: ${num}/month` : `${label}: Unlimited`;
      return text;
    });
    setForm((f) => ({ ...f, features: lines.join('\n') }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const features = form.features.split('\n').map((f) => f.trim()).filter(Boolean);
    const limitVal = (v: '' | number) => (v === '' || v === 0 ? null : Number(v) || null);
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        priceMonthly: form.priceMonthly || null,
        tokenLimitMonthly: form.tokenLimitMonthly || null,
        features,
        badge: form.badge || null,
        limitProjectCreate: limitVal(form.limitProjectCreate),
        limitSave: limitVal(form.limitSave),
        limitExport: limitVal(form.limitExport),
        limitAnalyze: limitVal(form.limitAnalyze),
        limitFetch: limitVal(form.limitFetch),
        limitReadMode: limitVal(form.limitReadMode),
        limitCharacterCreate: limitVal(form.limitCharacterCreate),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setCreateOpen(false);
    fetchPlans();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setError('');
    setSaving(true);
    const features = form.features.split('\n').map((f) => f.trim()).filter(Boolean);
    const limitVal = (v: '' | number) => (v === '' || v === 0 ? null : Number(v) || null);
    const res = await fetch(`/api/admin/plans/${editTarget._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        priceMonthly: form.priceMonthly || null,
        tokenLimitMonthly: form.tokenLimitMonthly || null,
        features,
        badge: form.badge || null,
        limitProjectCreate: limitVal(form.limitProjectCreate),
        limitSave: limitVal(form.limitSave),
        limitExport: limitVal(form.limitExport),
        limitAnalyze: limitVal(form.limitAnalyze),
        limitFetch: limitVal(form.limitFetch),
        limitReadMode: limitVal(form.limitReadMode),
        limitCharacterCreate: limitVal(form.limitCharacterCreate),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setEditTarget(null);
    fetchPlans();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/admin/plans/${deleteTarget._id}`, { method: 'DELETE' });
    setSaving(false);
    setDeleteTarget(null);
    fetchPlans();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard size={22} className="text-[#7C3AED]" />
            Plans
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage pricing plans for LP and billing</p>
        </div>
        {canUpdate && (
          <Button variant="accent" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus size={14} />
            New Plan
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-md overflow-hidden shadow-sm shadow-slate-200/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/50 bg-white/80">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Price/mo</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Token limit</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Discounts</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">CTA</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-500">Loading…</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-500">No plans</td></tr>
            ) : plans.map((p) => (
              <tr key={p._id} className="border-b border-slate-200/40 hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.badge && <Badge variant="accent" className="ml-2">{p.badge}</Badge>}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{formatRp(p.priceMonthly)}</td>
                <td className="px-5 py-3.5 text-slate-600">{p.tokenLimitMonthly != null ? p.tokenLimitMonthly.toLocaleString() : '∞'}</td>
                <td className="px-5 py-3.5 text-slate-600 text-xs">{p.discount1Month}% / {p.discount3Months}% / {p.discount6Months}%</td>
                <td className="px-5 py-3.5 text-slate-600">{p.cta}</td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    {canUpdate && (
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80" title="Edit">
                        <Edit2 size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <Modal title="Create Plan" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Name"><Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); if (!form.slug) setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })); }} required light /></Field>
            <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="starter" light /></Field>
            <Field label="Price/mo (IDR)"><Input type="number" min={0} value={form.priceMonthly || ''} onChange={(e) => setForm({ ...form, priceMonthly: parseInt(e.target.value, 10) || 0 })} placeholder="299000" light /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Discount 1m %"><Input type="number" min={0} max={100} value={form.discount1Month} onChange={(e) => setForm({ ...form, discount1Month: parseInt(e.target.value, 10) || 0 })} light /></Field>
              <Field label="Discount 3m %"><Input type="number" min={0} max={100} value={form.discount3Months} onChange={(e) => setForm({ ...form, discount3Months: parseInt(e.target.value, 10) || 0 })} light /></Field>
              <Field label="Discount 6m %"><Input type="number" min={0} max={100} value={form.discount6Months} onChange={(e) => setForm({ ...form, discount6Months: parseInt(e.target.value, 10) || 0 })} light /></Field>
            </div>
            <Field label="Token limit/month (0 = unlimited)"><Input type="number" min={0} value={form.tokenLimitMonthly || ''} onChange={(e) => setForm({ ...form, tokenLimitMonthly: parseInt(e.target.value, 10) || 0 })} placeholder="500000" light /></Field>
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Action limits (per month)</p>
              <p className="text-xs text-slate-500">Leave empty or 0 for unlimited</p>
              <div className="grid grid-cols-1 gap-2">
                {ACTION_LIMIT_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-800 w-40 flex-shrink-0">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      value={form[key] === '' ? '' : form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0 })}
                      placeholder="Unlimited"
                      className="bg-[#161B22] border-slate-200/60 max-w-32"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={generateFeaturesFromLimits} className="gap-1.5">
                <Sparkles size={14} />
                Generate features from limits
              </Button>
            </div>
            <Field label="Features (one per line)"><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-[#7C3AED]/50 outline-none resize-none" placeholder="Click Generate or type custom lines" /></Field>
            <Field label="CTA"><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} light /></Field>
            <Field label="Badge (optional)"><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Most Popular" light /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Plan" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required light /></Field>
            <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} light /></Field>
            <Field label="Price/mo (IDR)"><Input type="number" min={0} value={form.priceMonthly || ''} onChange={(e) => setForm({ ...form, priceMonthly: parseInt(e.target.value, 10) || 0 })} light /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Discount 1m %"><Input type="number" min={0} max={100} value={form.discount1Month} onChange={(e) => setForm({ ...form, discount1Month: parseInt(e.target.value, 10) || 0 })} light /></Field>
              <Field label="Discount 3m %"><Input type="number" min={0} max={100} value={form.discount3Months} onChange={(e) => setForm({ ...form, discount3Months: parseInt(e.target.value, 10) || 0 })} light /></Field>
              <Field label="Discount 6m %"><Input type="number" min={0} max={100} value={form.discount6Months} onChange={(e) => setForm({ ...form, discount6Months: parseInt(e.target.value, 10) || 0 })} light /></Field>
            </div>
            <Field label="Token limit/month"><Input type="number" min={0} value={form.tokenLimitMonthly || ''} onChange={(e) => setForm({ ...form, tokenLimitMonthly: parseInt(e.target.value, 10) || 0 })} light /></Field>
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Action limits (per month)</p>
              <p className="text-xs text-slate-500">Leave empty or 0 for unlimited</p>
              <div className="grid grid-cols-1 gap-2">
                {ACTION_LIMIT_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-800 w-40 flex-shrink-0">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      value={form[key] === '' ? '' : form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0 })}
                      placeholder="Unlimited"
                      className="bg-[#161B22] border-slate-200/60 max-w-32"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={generateFeaturesFromLimits} className="gap-1.5">
                <Sparkles size={14} />
                Generate features from limits
              </Button>
            </div>
            <Field label="Features (one per line)"><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-[#7C3AED]/50 outline-none resize-none" placeholder="Click Generate or type custom lines" /></Field>
            <Field label="CTA"><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} light /></Field>
            <Field label="Badge"><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} light /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Plan" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-800">Delete plan <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" disabled={saving} onClick={handleDelete}>{saving ? 'Deleting…' : 'Delete'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
