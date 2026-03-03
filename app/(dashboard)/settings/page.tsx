'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  Key,
  CreditCard,
  LogOut,
  Loader2,
  Check,
  Shield,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'profile' | 'security' | 'export' | 'account';

interface MeData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: { name: string; description?: string };
  createdAt: string;
  hasPassword: boolean;
}

interface ExportSettingsData {
  logoUrl: string | null;
  headerPlaceholder: string | null;
  footerPlaceholder: string | null;
  formality: string;
  companyName: string | null;
  tagline: string | null;
}

const DEFAULT_EXPORT_SETTINGS: ExportSettingsData = {
  logoUrl: null,
  headerPlaceholder: null,
  footerPlaceholder: null,
  formality: 'standard',
  companyName: null,
  tagline: null,
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Key },
  { id: 'export', label: 'Export', icon: FileDown },
  { id: 'account', label: 'Account', icon: Shield },
];

export default function SettingsPage() {
  const { logout } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Export settings
  const [exportSettings, setExportSettings] = useState<ExportSettingsData>(DEFAULT_EXPORT_SETTINGS);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSaving, setExportSaving] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setMe(d);
          setName(d.name ?? '');
          setEmail(d.email ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeSection !== 'export') return;
    setExportLoading(true);
    fetch('/api/users/me/export-settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setExportSettings({
            logoUrl: json.data.logoUrl ?? null,
            headerPlaceholder: json.data.headerPlaceholder ?? null,
            footerPlaceholder: json.data.footerPlaceholder ?? null,
            formality: json.data.formality ?? 'standard',
            companyName: json.data.companyName ?? null,
            tagline: json.data.tagline ?? null,
          });
        }
      })
      .catch(() => setExportSettings(DEFAULT_EXPORT_SETTINGS))
      .finally(() => setExportLoading(false));
  }, [activeSection]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.id) return;
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/users/${me.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!json.success) {
        setProfileError(json.message ?? 'Failed to update');
        return;
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('Request failed');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.id) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`/api/users/${me.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setPasswordError(json.message ?? 'Failed to update');
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError('Request failed');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveExportSettings(e: React.FormEvent) {
    e.preventDefault();
    setExportError(null);
    setExportSuccess(false);
    setExportSaving(true);
    try {
      const res = await fetch('/api/users/me/export-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl: exportSettings.logoUrl || null,
          headerPlaceholder: exportSettings.headerPlaceholder || null,
          footerPlaceholder: exportSettings.footerPlaceholder || null,
          formality: exportSettings.formality,
          companyName: exportSettings.companyName || null,
          tagline: exportSettings.tagline || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setExportError(json.message ?? 'Failed to save');
        return;
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch {
      setExportError('Request failed');
    } finally {
      setExportSaving(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  const roleName = me.role?.name ?? 'User';

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="mt-1 text-slate-500">
          Manage your profile, security, export options, and account.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar nav */}
        <nav className="lg:w-52 shrink-0">
          <div className="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-md shadow-sm shadow-slate-200/20 overflow-hidden">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors',
                  activeSection === id
                    ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-l-2 border-[#7C3AED]'
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-800'
                )}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </button>
            ))}
            <div className="border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50/80 transition-colors"
              >
                <LogOut size={18} className="shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-8">
          {activeSection === 'profile' && (
            <Card light className="border-slate-200/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80">
                    <User size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Profile</CardTitle>
                    <CardDescription className="text-slate-500">Update your display name and email.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={saveProfile}>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {me.image ? (
                      <Image src={me.image} alt="" width={64} height={64} className="rounded-full" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/60 text-xl font-semibold text-slate-800">
                        {(me.name || me.email)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="flex-1 space-y-4">
                      <Input light label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                      <Input light label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                  </div>
                  {profileError && <p className="text-sm text-red-500">{profileError}</p>}
                </CardContent>
                <CardFooter className="flex items-center gap-3">
                  <Button type="submit" disabled={profileSaving} isLoading={profileSaving}>
                    {profileSuccess ? <Check size={18} /> : null}
                    {profileSuccess ? 'Saved' : 'Save changes'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {activeSection === 'security' && me.hasPassword && (
            <Card light className="border-slate-200/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80">
                    <Key size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Change password</CardTitle>
                    <CardDescription className="text-slate-500">Update your password for credential sign-in.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={savePassword}>
                <CardContent className="space-y-4">
                  <Input light label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" required />
                  <Input light label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} />
                  <Input light label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={passwordSaving} isLoading={passwordSaving} variant="secondary">
                    {passwordSuccess ? <Check size={18} /> : null}
                    {passwordSuccess ? 'Updated' : 'Update password'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {activeSection === 'security' && !me.hasPassword && (
            <Card light className="border-slate-200/50 shadow-sm">
              <CardContent className="py-8 text-center text-slate-500">
                You signed in with a social account. Password change is not available.
              </CardContent>
            </Card>
          )}

          {activeSection === 'export' && (
            <Card light className="border-slate-200/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
                    <FileDown size={20} className="text-[#7C3AED]" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Export</CardTitle>
                    <CardDescription className="text-slate-500">Customize logo, placeholders, and formality for PDF and Word exports.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {exportLoading ? (
                <CardContent className="py-12 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
                </CardContent>
              ) : (
                <form onSubmit={saveExportSettings}>
                  <CardContent className="space-y-5">
                    <Input
                      light
                      label="Logo URL"
                      value={exportSettings.logoUrl ?? ''}
                      onChange={(e) => setExportSettings((s) => ({ ...s, logoUrl: e.target.value || null }))}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-slate-500 -mt-2">Leave empty to use the app default logo. PNG or JPEG.</p>

                    <Input
                      light
                      label="Company name"
                      value={exportSettings.companyName ?? ''}
                      onChange={(e) => setExportSettings((s) => ({ ...s, companyName: e.target.value || null }))}
                      placeholder="Your company or brand name"
                    />

                    <Input
                      light
                      label="Tagline"
                      value={exportSettings.tagline ?? ''}
                      onChange={(e) => setExportSettings((s) => ({ ...s, tagline: e.target.value || null }))}
                      placeholder="e.g. AI-Powered Script Writing"
                    />

                    <Input
                      light
                      label="Header placeholder"
                      value={exportSettings.headerPlaceholder ?? ''}
                      onChange={(e) => setExportSettings((s) => ({ ...s, headerPlaceholder: e.target.value || null }))}
                      placeholder="e.g. Confidential, Draft"
                    />

                    <Input
                      light
                      label="Footer placeholder"
                      value={exportSettings.footerPlaceholder ?? ''}
                      onChange={(e) => setExportSettings((s) => ({ ...s, footerPlaceholder: e.target.value || null }))}
                      placeholder="e.g. Page {page} of {total}"
                    />
                    <p className="text-xs text-slate-500 -mt-2">Use {'{page}'} and {'{total}'} for page numbers in PDF.</p>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Formality</label>
                      <select
                        value={exportSettings.formality}
                        onChange={(e) => setExportSettings((s) => ({ ...s, formality: e.target.value }))}
                        className="w-full h-11 rounded-xl border border-slate-200/80 bg-white px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/40"
                      >
                        <option value="minimal">Minimal</option>
                        <option value="standard">Standard</option>
                        <option value="formal">Formal</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Affects title style in PDF and Word (e.g. adds “– Formal”).</p>
                    </div>

                    {exportError && <p className="text-sm text-red-500">{exportError}</p>}
                  </CardContent>
                  <CardFooter className="flex items-center gap-3">
                    <Button type="submit" disabled={exportSaving} isLoading={exportSaving}>
                      {exportSuccess ? <Check size={18} /> : null}
                      {exportSuccess ? 'Saved' : 'Save export settings'}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          )}

          {activeSection === 'account' && (
            <Card light className="border-slate-200/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80">
                    <Shield size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Account</CardTitle>
                    <CardDescription className="text-slate-500">Your account details and quick links.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Role</p>
                    <p className="mt-1 text-slate-800">{roleName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Member since</p>
                    <p className="mt-1 text-slate-800">{formatDate(me.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/billing">
                    <Button variant="outline" size="sm" className="gap-2">
                      <CreditCard size={16} />
                      Billing & subscription
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
