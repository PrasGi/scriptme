'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Tag, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

interface Voucher {
  _id: string;
  code: string;
  type: string;
  value: number;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  planIds: string[];
  isActive: boolean;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VouchersPage() {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('role', 'update', 'all');
  const canDelete = hasPermission('role', 'delete', 'all');

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Voucher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: 0,
    validFrom: '',
    validTo: '',
    usageLimit: '',
    perUserLimit: '',
    isActive: true,
  });

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/vouchers');
    const json = await res.json();
    if (json.success) setVouchers(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  function openCreate() {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setForm({
      code: '',
      type: 'percent',
      value: 20,
      validFrom: now.toISOString().slice(0, 10),
      validTo: nextMonth.toISOString().slice(0, 10),
      usageLimit: '',
      perUserLimit: '1',
      isActive: true,
    });
    setError('');
    setCreateOpen(true);
  }

  function openEdit(v: Voucher) {
    setForm({
      code: v.code,
      type: v.type as 'percent' | 'fixed',
      value: v.value,
      validFrom: v.validFrom ? new Date(v.validFrom).toISOString().slice(0, 10) : '',
      validTo: v.validTo ? new Date(v.validTo).toISOString().slice(0, 10) : '',
      usageLimit: v.usageLimit != null ? String(v.usageLimit) : '',
      perUserLimit: v.perUserLimit != null ? String(v.perUserLimit) : '',
      isActive: v.isActive ?? true,
    });
    setError('');
    setEditTarget(v);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch('/api/admin/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.value,
        validFrom: form.validFrom,
        validTo: form.validTo,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
        perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : null,
        isActive: form.isActive,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setCreateOpen(false);
    fetchVouchers();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setError('');
    setSaving(true);
    const res = await fetch(`/api/admin/vouchers/${editTarget._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.value,
        validFrom: form.validFrom,
        validTo: form.validTo,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
        perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : null,
        isActive: form.isActive,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setEditTarget(null);
    fetchVouchers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/admin/vouchers/${deleteTarget._id}`, { method: 'DELETE' });
    setSaving(false);
    setDeleteTarget(null);
    fetchVouchers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag size={22} className="text-[#7C3AED]" />
            Vouchers
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Manage discount coupons for checkout</p>
        </div>
        {canUpdate && (
          <Button variant="accent" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus size={14} />
            New Voucher
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Code</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Value</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Valid</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase">Usage</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-[#8B949E]">Loading…</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-[#8B949E]">No vouchers</td></tr>
            ) : vouchers.map((v) => (
              <tr key={v._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <span className="font-mono font-medium text-white">{v.code}</span>
                  {!v.isActive && <Badge variant="red" className="ml-2">Inactive</Badge>}
                </td>
                <td className="px-5 py-3.5 text-[#8B949E] capitalize">{String(v.type)}</td>
                <td className="px-5 py-3.5 text-[#8B949E]">{v.type === 'percent' ? `${v.value}%` : `Rp ${v.value.toLocaleString('id-ID')}`}</td>
                <td className="px-5 py-3.5 text-[#8B949E] text-xs">{formatDate(v.validFrom)} – {formatDate(v.validTo)}</td>
                <td className="px-5 py-3.5 text-[#8B949E]">{v.usageCount}{v.usageLimit != null ? ` / ${v.usageLimit}` : ''}</td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    {canUpdate && <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.08]" title="Edit"><Edit2 size={15} /></button>}
                    {canDelete && <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-lg text-[#8B949E] hover:text-red-400 hover:bg-red-500/10" title="Delete"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <Modal title="Create Voucher" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" required className="bg-[#161B22] border-white/[0.08] font-mono" /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })} className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:border-[#7C3AED]/50 outline-none">
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (IDR)</option>
              </select>
            </Field>
            <Field label={form.type === 'percent' ? 'Discount %' : 'Discount (IDR)'}><Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: parseInt(e.target.value, 10) || 0 })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valid from"><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Valid to"><Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usage limit (empty = ∞)"><Input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Per user limit (empty = ∞)"><Input type="number" min={0} value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="1" className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <div className="flex items-center gap-2 pt-1"><input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#7C3AED]" /><label htmlFor="isActive" className="text-sm text-[#8B949E]">Active</label></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" variant="accent" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button></div>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Voucher" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="bg-[#161B22] border-white/[0.08] font-mono" /></Field>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })} className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:border-[#7C3AED]/50 outline-none"><option value="percent">Percent (%)</option><option value="fixed">Fixed (IDR)</option></select></Field>
            <Field label={form.type === 'percent' ? 'Discount %' : 'Discount (IDR)'}><Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: parseInt(e.target.value, 10) || 0 })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valid from"><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Valid to"><Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usage limit"><Input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Per user limit"><Input type="number" min={0} value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <div className="flex items-center gap-2 pt-1"><input type="checkbox" id="isActiveEdit" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#7C3AED]" /><label htmlFor="isActiveEdit" className="text-sm text-[#8B949E]">Active</label></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Voucher" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white">Delete voucher <strong>{deleteTarget.code}</strong>?</p>
            </div>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" disabled={saving} onClick={handleDelete}>{saving ? 'Deleting…' : 'Delete'}</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
