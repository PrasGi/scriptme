'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Users, Plus, Search, Edit2, Trash2, ShieldCheck, X, Check, Minus,
  ChevronLeft, ChevronRight, AlertTriangle, Gift,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id:            string;
  name:          string;
  email:         string;
  image?:        string | null;
  role:          { _id: string; name: string } | string;
  isActive:      boolean;
  emailVerified: string | null;
  createdAt:     string;
}

interface Role {
  id:          string;
  name:        string;
  description: string;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
}

interface PermissionRow {
  id:          string;
  resource:    string;
  action:      string;
  scope:       string;
  description: string;
  key:         string;
  fromRole:    boolean;
  override:    boolean | null;
  effective:   boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleName(user: User): string {
  if (typeof user.role === 'string') return user.role;
  return user.role?.name ?? '—';
}

function roleId(user: User): string {
  if (typeof user.role === 'string') return user.role;
  return user.role?._id ?? '';
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

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

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { hasPermission } = usePermissions();
  const canCreate      = hasPermission('user', 'create', 'all');
  const canUpdate      = hasPermission('user', 'update', 'all');
  const canDelete      = hasPermission('user', 'delete', 'all');

  const [users,   setUsers]   = useState<User[]>([]);
  const [roles,   setRoles]   = useState<Role[]>([]);
  const [plans,   setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const LIMIT = 15;

  // ─── Modals ────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [grantTarget,   setGrantTarget]   = useState<User | null>(null);
  const [permTarget,   setPermTarget]   = useState<User | null>(null);
  const [permRows,     setPermRows]     = useState<PermissionRow[]>([]);
  const [permLoading,  setPermLoading]  = useState(false);
  const [permSearch,   setPermSearch]   = useState('');
  const [permFilter,   setPermFilter]   = useState<'all'|'effective'|'not-effective'|'override'|'from-role'>('all');
  const [saving,       setSaving]       = useState(false);
  const [error, setError] = useState('');

  // ─── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '', isActive: true });
  const [grantForm, setGrantForm] = useState({ planId: '', months: 1, days: '' });

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set('search', search);
    const res  = await fetch(`/api/users?${params}`);
    const json = await res.json();
    if (json.success) {
      setUsers(json.data.users);
      setTotal(json.data.pagination.total);
      setPages(json.data.pagination.pages);
    }
    setLoading(false);
  }, [page, search]);

  const fetchRoles = useCallback(async () => {
    const res  = await fetch('/api/iam/roles');
    const json = await res.json();
    if (json.success) setRoles(json.data);
  }, []);

  const fetchPlans = useCallback(async () => {
    const res  = await fetch('/api/admin/plans');
    const json = await res.json();
    if (json.success) setPlans(json.data ?? []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ─── Create user ────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res  = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setCreateOpen(false);
    setForm({ name: '', email: '', password: '', roleId: '', isActive: true });
    fetchUsers();
  }

  // ─── Edit user ──────────────────────────────────────────────────────────────

  function openEdit(user: User) {
    setEditTarget(user);
    setForm({ name: user.name, email: user.email, password: '', roleId: roleId(user), isActive: user.isActive });
    setError('');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setError('');
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name, email: form.email, roleId: form.roleId, isActive: form.isActive };
    const res  = await fetch(`/api/users/${editTarget.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setEditTarget(null);
    fetchUsers();
  }

  // ─── Delete user ────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
    setSaving(false);
    setDeleteTarget(null);
    fetchUsers();
  }

  async function handleGrantSubscription() {
    if (!grantTarget) return;
    const { planId, months, days } = grantForm;
    if (!planId) { setError('Select a plan'); return; }
    const body = months > 0 ? { planId, months } : days ? { planId, days: parseInt(days, 10) } : null;
    if (!body) { setError('Enter months or days'); return; }
    setError('');
    setSaving(true);
    const res = await fetch(`/api/admin/users/${grantTarget.id}/grant-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.message ?? 'Failed'); return; }
    setGrantTarget(null);
    setGrantForm({ planId: '', months: 1, days: '' });
    fetchUsers();
  }

  // ─── Manage permissions ────────────────────────────────────────────────────

  async function openPermissions(user: User) {
    setPermTarget(user);
    setPermLoading(true);
    setPermSearch('');
    setPermFilter('all');
    const res  = await fetch(`/api/users/${user.id}/permissions`);
    const json = await res.json();
    if (json.success) setPermRows(json.data.permissions);
    setPermLoading(false);
  }

  async function togglePermOverride(row: PermissionRow, next: boolean | null) {
    if (!permTarget) return;
    await fetch(`/api/users/${permTarget.id}/permissions`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ overrides: [{ permissionId: row.id, granted: next }] }),
    });
    setPermRows((prev) =>
      prev.map((r) => r.id === row.id ? { ...r, override: next, effective: next === null ? r.fromRole : next } : r)
    );
  }

  // ─── Grouped permissions (with search + filter) ─────────────────────────────

  const filteredPermRows = permRows.filter((r) => {
    if (permSearch) {
      const q = permSearch.toLowerCase();
      const matches =
        r.resource.includes(q) ||
        r.action.includes(q) ||
        r.scope.includes(q) ||
        (r.description ?? '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (permFilter === 'effective')     return r.effective;
    if (permFilter === 'not-effective') return !r.effective;
    if (permFilter === 'override')      return r.override !== null;
    if (permFilter === 'from-role')     return r.fromRole;
    return true;
  });

  const permGroups = filteredPermRows.reduce<Record<string, PermissionRow[]>>((acc, r) => {
    if (!acc[r.resource]) acc[r.resource] = [];
    acc[r.resource].push(r);
    return acc;
  }, {});

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-[#06B6D4]" />
            Users
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Manage user accounts, roles and permission overrides</p>
        </div>
        {canCreate && (
          <Button variant="cyan" size="sm" onClick={() => { setCreateOpen(true); setError(''); setForm({ name: '', email: '', password: '', roleId: roles[0]?.id ?? '', isActive: true }); }} className="gap-1.5">
            <Plus size={14} />
            New User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0D1117] border-white/[0.08] text-sm"
          />
        </div>
        <span className="text-sm text-[#8B949E]">{total} user{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-16 text-[#8B949E]">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-[#8B949E]">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-xs font-bold text-[#06B6D4] flex-shrink-0">
                      {initials(user.name)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-[#8B949E]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={roleName(user) === 'admin' ? 'cyan' : 'default'} className="capitalize">
                    {roleName(user)}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  {user.isActive
                    ? <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                    : <Badge variant="default" className="bg-red-500/10 text-red-400 border-red-500/20">Inactive</Badge>
                  }
                </td>
                <td className="px-5 py-3.5 text-[#8B949E]">{formatDate(user.createdAt)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {canUpdate && (
                      <button
                        onClick={() => { setGrantTarget(user); setGrantForm({ planId: plans[0]?._id ?? '', months: 1, days: '' }); setError(''); }}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Give subscription"
                      >
                        <Gift size={15} />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => openPermissions(user)}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-all"
                        title="Manage permissions"
                      >
                        <ShieldCheck size={15} />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.08] transition-all"
                        title="Edit user"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-[#8B949E]">Page {page} of {pages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      {createOpen && (
        <Modal title="Create User" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Full Name">
              <Input placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" />
            </Field>
            <Field label="Email">
              <Input type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" />
            </Field>
            <Field label="Role">
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                required
                className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]/50"
              >
                <option value="">Select a role…</option>
                {roles.map((r) => <option key={r.id} value={r.id} className="capitalize">{r.name}</option>)}
              </select>
            </Field>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="is-active-create" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#06B6D4]" />
              <label htmlFor="is-active-create" className="text-sm text-[#8B949E]">Active account</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="cyan" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title="Edit User" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Full Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" />
            </Field>
            <Field label="Role">
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]/50"
              >
                {roles.map((r) => <option key={r.id} value={r.id} className="capitalize">{r.name}</option>)}
              </select>
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is-active-edit" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#06B6D4]" />
              <label htmlFor="is-active-edit" className="text-sm text-[#8B949E]">Active account</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button variant="cyan" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Give Subscription Modal ───────────────────────────────────────────── */}
      {grantTarget && (
        <Modal title="Give Subscription" onClose={() => setGrantTarget(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <p className="text-sm text-[#8B949E]">Grant subscription to <strong className="text-white">{grantTarget.name}</strong></p>
            <Field label="Plan">
              <select
                value={grantForm.planId}
                onChange={(e) => setGrantForm({ ...grantForm, planId: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]/50"
              >
                <option value="">Select plan…</option>
                {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Months"><Input type="number" min={0} value={grantForm.months} onChange={(e) => setGrantForm({ ...grantForm, months: parseInt(e.target.value, 10) || 0 })} className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Days"><Input type="number" min={0} placeholder="30" value={grantForm.days || ''} onChange={(e) => setGrantForm({ ...grantForm, days: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <p className="text-xs text-[#8B949E]">Use months (e.g. 1, 3, 6) or days. Months take precedence if both set.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setGrantTarget(null)}>Cancel</Button>
              <Button variant="cyan" disabled={saving || !grantForm.planId} onClick={handleGrantSubscription}>{saving ? 'Granting…' : 'Grant Subscription'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">Are you sure you want to delete this user?</p>
                <p className="text-sm text-[#8B949E] mt-1">
                  <span className="text-white font-medium">{deleteTarget.name}</span> ({deleteTarget.email}) will be soft-deleted and lose access immediately. This action can be reversed by re-activating the account.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={saving}
                onClick={handleDelete}
              >
                {saving ? 'Deleting…' : 'Delete User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Permissions Modal ───────────────────────────────────────────────── */}
      {permTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Permission Overrides</h2>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  {permTarget.name} · <span className="capitalize">{roleName(permTarget)}</span> role
                </p>
              </div>
              <button onClick={() => setPermTarget(null)} className="text-[#8B949E] hover:text-white"><X size={18} /></button>
            </div>

            {/* Search + Filter */}
            <div className="px-6 py-3 border-b border-white/[0.04] flex-shrink-0 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
                <input
                  type="text"
                  placeholder="Search resource, action, scope…"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#161B22] border border-white/[0.08] text-sm text-white placeholder-[#8B949E] focus:outline-none focus:border-[#06B6D4]/50"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all','effective','not-effective','override','from-role'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPermFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                      permFilter === f
                        ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40'
                        : 'text-[#8B949E] hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    {f === 'all' ? `All (${permRows.length})` :
                     f === 'effective' ? `Effective (${permRows.filter(r=>r.effective).length})` :
                     f === 'not-effective' ? `Not effective (${permRows.filter(r=>!r.effective).length})` :
                     f === 'override' ? `Has override (${permRows.filter(r=>r.override!==null).length})` :
                     `From role (${permRows.filter(r=>r.fromRole).length})`}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 pt-0.5 text-xs text-[#8B949E]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Role default</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#06B6D4]/20 border border-[#06B6D4]/40" /> Override: granted</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/40" /> Override: revoked</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {permLoading ? (
                <p className="text-center text-[#8B949E] py-8">Loading permissions…</p>
              ) : Object.keys(permGroups).length === 0 ? (
                <p className="text-center text-[#8B949E] py-8">No permissions match your search</p>
              ) : Object.entries(permGroups).map(([resource, rows]) => (
                <div key={resource}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8B949E] mb-2">{resource}</h3>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {rows.map((row, i) => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}
                      >
                        <div>
                          <span className="text-sm text-white font-mono">{row.action}:{row.scope}</span>
                          <span className="text-xs text-[#8B949E] ml-2">{row.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Grant override */}
                          <button
                            onClick={() => togglePermOverride(row, row.override === true ? null : true)}
                            className={`p-1.5 rounded-lg transition-all text-xs ${
                              row.override === true
                                ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40'
                                : 'text-[#8B949E] hover:bg-[#06B6D4]/10 hover:text-[#06B6D4]'
                            }`}
                            title="Grant override"
                          >
                            <Check size={13} />
                          </button>
                          {/* Revoke override */}
                          <button
                            onClick={() => togglePermOverride(row, row.override === false ? null : false)}
                            className={`p-1.5 rounded-lg transition-all ${
                              row.override === false
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'text-[#8B949E] hover:bg-red-500/10 hover:text-red-400'
                            }`}
                            title="Revoke override"
                          >
                            <Minus size={13} />
                          </button>
                          {/* Effective badge */}
                          <span className={`ml-1 w-2 h-2 rounded-full flex-shrink-0 ${row.effective ? 'bg-emerald-400' : 'bg-[#8B949E]/30'}`} title={row.effective ? 'Effective' : 'Not effective'} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end flex-shrink-0">
              <Button variant="secondary" onClick={() => setPermTarget(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
