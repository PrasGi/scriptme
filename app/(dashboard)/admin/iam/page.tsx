'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Shield, Plus, Edit2, Trash2, X, AlertTriangle, ChevronDown, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role       { id: string; name: string; description: string; isDefault: boolean; createdAt: string }
interface Permission { id: string; resource: string; action: string; scope: string; description: string; key: string; createdAt: string }
interface RolePerm   { id: string; roleId: string; permission: { id: string; resource: string; action: string; scope: string; description: string; key: string } }
interface UserItem   { id: string; name: string; email: string; role: { _id: string; name: string } | string }
interface UserPerm   { id: string; userId: string; granted: boolean; permission: { id: string; resource: string; action: string; scope: string; description: string; key: string } }

type Tab = 'roles' | 'permissions' | 'role-permissions' | 'user-permissions';

interface CanFlags {
  createRole:   boolean;
  updateRole:   boolean;
  deleteRole:   boolean;
  createPerm:   boolean;
  updatePerm:   boolean;
  deletePerm:   boolean;
  updateUser:   boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, wide, children }: {
  title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-white/[0.08] bg-[#0D1117] shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-[#8B949E] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-white"><X size={18} /></button>
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

function ScopeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]/50">
      <option value="own">own</option>
      <option value="all">all</option>
    </select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IAMPage() {
  const [tab, setTab] = useState<Tab>('roles');

  const { hasPermission } = usePermissions();
  const can: CanFlags = {
    createRole:   hasPermission('role',       'create', 'all'),
    updateRole:   hasPermission('role',       'update', 'all'),
    deleteRole:   hasPermission('role',       'delete', 'all'),
    createPerm:   hasPermission('permission', 'create', 'all'),
    updatePerm:   hasPermission('permission', 'update', 'all'),
    deletePerm:   hasPermission('permission', 'delete', 'all'),
    updateUser:   hasPermission('user',       'update', 'all'),
  };

  // ─── Shared data ──────────────────────────────────────────────────────────
  const [roles,       setRoles]       = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users,       setUsers]       = useState<UserItem[]>([]);

  const fetchRoles       = useCallback(async () => { const r = await fetch('/api/iam/roles');       const j = await r.json(); if (j.success) setRoles(j.data); }, []);
  const fetchPermissions = useCallback(async () => { const r = await fetch('/api/iam/permissions'); const j = await r.json(); if (j.success) setPermissions(j.data); }, []);
  const fetchUsers       = useCallback(async () => { const r = await fetch('/api/users?limit=200'); const j = await r.json(); if (j.success) setUsers(j.data.users); }, []);

  useEffect(() => { fetchRoles(); fetchPermissions(); fetchUsers(); }, [fetchRoles, fetchPermissions, fetchUsers]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'roles',            label: 'Roles' },
    { key: 'permissions',      label: 'Permissions' },
    { key: 'role-permissions', label: 'Role Permissions' },
    { key: 'user-permissions', label: 'User Permissions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={22} className="text-[#7C3AED]" />
          Identity & Access Management
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">Manage roles, permissions and access control policies</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D1117] border border-white/[0.06] w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                : 'text-[#8B949E] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'roles'            && <RolesTab            roles={roles} onRefresh={fetchRoles} can={can} />}
      {tab === 'permissions'      && <PermissionsTab      permissions={permissions} onRefresh={fetchPermissions} can={can} />}
      {tab === 'role-permissions' && <RolePermissionsTab  roles={roles} permissions={permissions} can={can} />}
      {tab === 'user-permissions' && <UserPermissionsTab  users={users} permissions={permissions} can={can} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Roles
// ────────────────────────────────────────────────────────────────────────────

function RolesTab({ roles, onRefresh, can }: { roles: Role[]; onRefresh: () => void; can: CanFlags }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [form, setForm] = useState({ name: '', description: '', isDefault: false });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    const res  = await fetch('/api/iam/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setCreateOpen(false); setForm({ name: '', description: '', isDefault: false }); onRefresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget) return; setError(''); setSaving(true);
    const res  = await fetch(`/api/iam/roles/${editTarget.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setEditTarget(null); onRefresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return; setSaving(true);
    await fetch(`/api/iam/roles/${deleteTarget.id}`, { method: 'DELETE' });
    setSaving(false); setDeleteTarget(null); onRefresh();
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#8B949E]">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
        {can.createRole && (
          <Button variant="accent" size="sm" onClick={() => { setCreateOpen(true); setError(''); setForm({ name: '', description: '', isDefault: false }); }} className="gap-1.5">
            <Plus size={14} /> New Role
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Description</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Default</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {roles.map((role, i) => (
              <tr key={role.id} className={`${i > 0 ? 'border-t border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                <td className="px-5 py-3.5">
                  <Badge variant={role.name === 'admin' ? 'accent' : 'default'} className="capitalize">{role.name}</Badge>
                </td>
                <td className="px-5 py-3.5 text-[#8B949E]">{role.description}</td>
                <td className="px-5 py-3.5">
                  {role.isDefault && <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Default</Badge>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {can.updateRole && (
                      <button onClick={() => { setEditTarget(role); setForm({ name: role.name, description: role.description, isDefault: role.isDefault }); setError(''); }}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.08] transition-all"><Edit2 size={14} /></button>
                    )}
                    {can.deleteRole && role.name !== 'admin' && (
                      <button onClick={() => setDeleteTarget(role)}
                        className="p-1.5 rounded-lg text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create */}
      {createOpen && (
        <Modal title="Create Role" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Name"><Input placeholder="editor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            <Field label="Description"><Input placeholder="Can edit content…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="flex items-center gap-2"><input type="checkbox" id="default-create" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-[#7C3AED]" /><label htmlFor="default-create" className="text-sm text-[#8B949E]">Set as default role for new users</label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="accent" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Role'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit */}
      {editTarget && (
        <Modal title="Edit Role" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="flex items-center gap-2"><input type="checkbox" id="default-edit" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-[#7C3AED]" /><label htmlFor="default-edit" className="text-sm text-[#8B949E]">Set as default role</label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button variant="accent" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete */}
      {deleteTarget && (
        <Modal title="Delete Role" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#8B949E]">Delete role <span className="text-white font-medium capitalize">{deleteTarget.name}</span>? All role-permission mappings for this role will also be removed.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" disabled={saving} onClick={handleDelete}>{saving ? 'Deleting…' : 'Delete Role'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Permissions
// ────────────────────────────────────────────────────────────────────────────

function PermissionsTab({ permissions, onRefresh, can }: { permissions: Permission[]; onRefresh: () => void; can: CanFlags }) {
  const [createOpen,   setCreateOpen]  = useState(false);
  const [editTarget,   setEditTarget]  = useState<Permission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [form, setForm] = useState({ resource: '', action: '', scope: 'own', description: '' });
  const [search, setSearch] = useState('');

  const filtered = permissions.filter((p) =>
    !search || p.key.includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group by resource
  const groups = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    const res  = await fetch('/api/iam/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setCreateOpen(false); setForm({ resource: '', action: '', scope: 'own', description: '' }); onRefresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget) return; setError(''); setSaving(true);
    const res  = await fetch(`/api/iam/permissions/${editTarget.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!json.success) { setError(json.message); return; }
    setEditTarget(null); onRefresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return; setSaving(true);
    await fetch(`/api/iam/permissions/${deleteTarget.id}`, { method: 'DELETE' });
    setSaving(false); setDeleteTarget(null); onRefresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative max-w-xs flex-1">
          <Input placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-[#0D1117] border-white/[0.08] text-sm pl-3" />
        </div>
        {can.createPerm && (
          <Button variant="accent" size="sm" onClick={() => { setCreateOpen(true); setError(''); setForm({ resource: '', action: '', scope: 'own', description: '' }); }} className="gap-1.5 ml-3">
            <Plus size={14} /> New Permission
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([resource, perms]) => (
          <div key={resource} className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
            <div className="px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">{resource}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {perms.map((p, i) => (
                  <tr key={p.id} className={`${i > 0 ? 'border-t border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                    <td className="px-5 py-3 font-mono text-[#7C3AED] text-xs">{p.key}</td>
                    <td className="px-5 py-3 text-[#8B949E]">{p.description}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can.updatePerm && (
                          <button onClick={() => { setEditTarget(p); setForm({ resource: p.resource, action: p.action, scope: p.scope, description: p.description }); setError(''); }}
                            className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-white/[0.08] transition-all"><Edit2 size={13} /></button>
                        )}
                        {can.deletePerm && (
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Create */}
      {createOpen && (
        <Modal title="Create Permission" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Resource"><Input placeholder="project" value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Action"><Input placeholder="create" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <Field label="Scope"><ScopeSelect value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} /></Field>
            <Field label="Description"><Input placeholder="Create own projects" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="accent" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit */}
      {editTarget && (
        <Modal title="Edit Permission" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Resource"><Input value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
              <Field label="Action"><Input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            </div>
            <Field label="Scope"><ScopeSelect value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} /></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#161B22] border-white/[0.08]" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button variant="accent" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete */}
      {deleteTarget && (
        <Modal title="Delete Permission" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#8B949E]">Delete <span className="font-mono text-white">{deleteTarget.key}</span>? It will be removed from all roles and user overrides.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" disabled={saving} onClick={handleDelete}>{saving ? 'Deleting…' : 'Delete'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Role Permissions
// ────────────────────────────────────────────────────────────────────────────

function RolePermissionsTab({ roles, permissions, can }: { roles: Role[]; permissions: Permission[]; can: CanFlags }) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assigned, setAssigned] = useState<Set<string>>(new Set()); // permissionIds
  const [rpMap,    setRpMap]    = useState<Map<string, string>>(new Map()); // permId → rpId
  const [loading,  setLoading]  = useState(false);

  async function loadRolePerms(roleId: string) {
    if (!roleId) return;
    setLoading(true);
    const res  = await fetch(`/api/iam/role-permissions?roleId=${roleId}`);
    const json = await res.json();
    if (json.success) {
      const ids = new Set<string>();
      const map = new Map<string, string>();
      for (const rp of json.data) { ids.add(rp.permission.id); map.set(rp.permission.id, rp.id); }
      setAssigned(ids);
      setRpMap(map);
    }
    setLoading(false);
  }

  useEffect(() => { if (selectedRoleId) loadRolePerms(selectedRoleId); }, [selectedRoleId]);

  async function togglePerm(perm: Permission) {
    if (!selectedRoleId) return;
    if (assigned.has(perm.id)) {
      // Remove
      const rpId = rpMap.get(perm.id);
      if (!rpId) return;
      await fetch(`/api/iam/role-permissions/${rpId}`, { method: 'DELETE' });
      setAssigned((prev) => { const s = new Set(prev); s.delete(perm.id); return s; });
      setRpMap((prev) => { const m = new Map(prev); m.delete(perm.id); return m; });
    } else {
      // Add
      const res = await fetch('/api/iam/role-permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId, permissionId: perm.id }),
      });
      const json = await res.json();
      if (json.success) {
        setAssigned((prev) => new Set([...prev, perm.id]));
        setRpMap((prev) => new Map([...prev, [perm.id, json.data.id]]));
      }
    }
  }

  const groups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="appearance-none w-full rounded-xl border border-white/[0.08] bg-[#0D1117] px-4 py-2 text-sm text-white pr-9 focus:outline-none focus:border-[#7C3AED]/50"
          >
            <option value="">Select a role…</option>
            {roles.map((r) => <option key={r.id} value={r.id} className="capitalize">{r.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none" />
        </div>
        {selectedRoleId && (
          <span className="text-sm text-[#8B949E]">{assigned.size} permissions assigned</span>
        )}
      </div>

      {!selectedRoleId ? (
        <div className="text-center py-16 text-[#8B949E] text-sm">Select a role to manage its permissions</div>
      ) : loading ? (
        <div className="text-center py-16 text-[#8B949E] text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([resource, perms]) => (
            <div key={resource} className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
              <div className="px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">{resource}</span>
                <span className="text-xs text-[#8B949E]">{perms.filter((p) => assigned.has(p.id)).length}/{perms.length}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {perms.map((perm) => {
                  const on = assigned.has(perm.id);
                  return (
                    <label key={perm.id} className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors">
                      <div
                        onClick={() => can.updateRole && togglePerm(perm)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                          can.updateRole ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } ${
                          on ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-white/[0.15] bg-transparent hover:border-[#7C3AED]/50'
                        }`}
                      >
                        {on && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-xs text-[#7C3AED]">{perm.key}</span>
                        <span className="text-xs text-[#8B949E] ml-2">{perm.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: User Permissions
// ────────────────────────────────────────────────────────────────────────────

function UserPermissionsTab({ users, permissions, can }: { users: UserItem[]; permissions: Permission[]; can: CanFlags }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search,         setSearch]         = useState('');
  const [overrides,      setOverrides]      = useState<Map<string, { id: string; granted: boolean }>>(new Map()); // permId → override
  const [fromRole,       setFromRole]       = useState<Set<string>>(new Set()); // permIds from role
  const [loading,        setLoading]        = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  async function loadUserPerms(userId: string) {
    setLoading(true);
    // Load full user + permissions + overrides
    const res  = await fetch(`/api/users/${userId}/permissions`);
    const json = await res.json();
    if (json.success) {
      const map  = new Map<string, { id: string; granted: boolean }>();
      const role = new Set<string>();
      for (const p of json.data.permissions) {
        if (p.override !== null) map.set(p.id, { id: p.id, granted: p.override });
        if (p.fromRole) role.add(p.id);
      }
      setOverrides(map);
      setFromRole(role);
    }
    setLoading(false);
  }

  useEffect(() => { if (selectedUserId) loadUserPerms(selectedUserId); }, [selectedUserId]);

  async function setOverride(perm: Permission, granted: boolean | 'remove') {
    if (!selectedUserId) return;
    if (granted === 'remove') {
      // Find the override row id — we need to look it up from API
      const up = overrides.get(perm.id);
      if (!up) return;
      // Use the user permissions bulk endpoint to remove
      await fetch(`/api/users/${selectedUserId}/permissions`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: [{ permissionId: perm.id, granted: null }] }),
      });
      setOverrides((prev) => { const m = new Map(prev); m.delete(perm.id); return m; });
    } else {
      await fetch(`/api/iam/user-permissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, permissionId: perm.id, granted }),
      });
      setOverrides((prev) => new Map([...prev, [perm.id, { id: perm.id, granted }]]));
    }
  }

  const filteredPerms = search
    ? permissions.filter((p) => p.key.includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
    : permissions;

  const groups = filteredPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  function getStatus(perm: Permission): 'granted-override' | 'revoked-override' | 'from-role' | 'none' {
    const ov = overrides.get(perm.id);
    if (ov !== undefined) return ov.granted ? 'granted-override' : 'revoked-override';
    if (fromRole.has(perm.id)) return 'from-role';
    return 'none';
  }

  return (
    <div className="space-y-5">
      {/* User selector */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="appearance-none w-full rounded-xl border border-white/[0.08] bg-[#0D1117] px-4 py-2 text-sm text-white pr-9 focus:outline-none focus:border-[#7C3AED]/50"
          >
            <option value="">Select a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none" />
        </div>
        {selectedUser && (
          <div className="flex items-center gap-2 text-sm text-[#8B949E]">
            <Badge variant="default" className="capitalize">
              {typeof selectedUser.role === 'string' ? selectedUser.role : selectedUser.role?.name}
            </Badge>
            <span>{overrides.size} override{overrides.size !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Permission search */}
      {selectedUserId && (
        <Input placeholder="Filter permissions…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-[#0D1117] border-white/[0.08] text-sm max-w-xs" />
      )}

      {/* Legend */}
      {selectedUserId && !loading && (
        <div className="flex items-center gap-5 text-xs text-[#8B949E]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> From role</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Override: granted</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Override: revoked</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20" /> No access</span>
        </div>
      )}

      {!selectedUserId ? (
        <div className="text-center py-16 text-[#8B949E] text-sm">Select a user to manage permission overrides</div>
      ) : loading ? (
        <div className="text-center py-16 text-[#8B949E] text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([resource, perms]) => (
            <div key={resource} className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
              <div className="px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8B949E]">{resource}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {perms.map((perm) => {
                  const status = getStatus(perm);
                  const ov = overrides.get(perm.id);
                  return (
                    <div key={perm.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        status === 'granted-override' ? 'bg-[#7C3AED]' :
                        status === 'revoked-override' ? 'bg-red-400' :
                        status === 'from-role'        ? 'bg-emerald-400' : 'bg-white/20'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-[#7C3AED]">{perm.key}</span>
                        <span className="text-xs text-[#8B949E] ml-2">{perm.description}</span>
                      </div>
                      {/* Override actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => can.updateUser && setOverride(perm, ov?.granted === true ? 'remove' : true)}
                          title="Grant override"
                          disabled={!can.updateUser}
                          className={`px-2 py-1 rounded-lg text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            ov?.granted === true
                              ? 'bg-[#7C3AED] text-white'
                              : 'text-[#8B949E] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] border border-transparent hover:border-[#7C3AED]/30'
                          }`}
                        >
                          Grant
                        </button>
                        <button
                          onClick={() => can.updateUser && setOverride(perm, ov?.granted === false ? 'remove' : false)}
                          title="Revoke override"
                          disabled={!can.updateUser}
                          className={`px-2 py-1 rounded-lg text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            ov?.granted === false
                              ? 'bg-red-600 text-white'
                              : 'text-[#8B949E] hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/30'
                          }`}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
