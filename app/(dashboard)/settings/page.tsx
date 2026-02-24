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
} from 'lucide-react';

interface MeData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: { name: string; description?: string };
  createdAt: string;
  hasPassword: boolean;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !me) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  const roleName = me.role?.name ?? 'User';

  return (
    <div className="w-full max-w-full space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-[#8B949E]">
          Manage your profile, account, and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <User size={20} className="text-[#8B949E]" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your display name and email.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={saveProfile}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {me.image ? (
                <Image
                  src={me.image}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.08] text-xl font-semibold text-white">
                  {(me.name || me.email)?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 space-y-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            {profileError && (
              <p className="text-sm text-red-400">{profileError}</p>
            )}
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={profileSaving} isLoading={profileSaving}>
              {profileSuccess ? <Check size={18} /> : null}
              {profileSuccess ? 'Saved' : 'Save changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Change password */}
      {me.hasPassword && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                <Key size={20} className="text-[#8B949E]" />
              </div>
              <div>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Update your password for credential sign-in.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={savePassword}>
            <CardContent className="space-y-4">
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="text-sm text-red-400">{passwordError}</p>
              )}
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

      {/* Account info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <Shield size={20} className="text-[#8B949E]" />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account details and quick links.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8B949E]">Role</p>
              <p className="mt-1 text-white">{roleName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8B949E]">Member since</p>
              <p className="mt-1 text-white">{formatDate(me.createdAt)}</p>
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

      {/* Sign out */}
      <Card className="border-red-500/20">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <LogOut size={20} className="text-red-400" />
              </div>
              <div>
                <p className="font-medium text-white">Sign out</p>
                <p className="text-sm text-[#8B949E]">Sign out of your account on this device.</p>
              </div>
            </div>
            <Button variant="danger" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
