'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { Bell, Send, Loader2, Users, User } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function AdminNotificationsPage() {
  const { hasPermission } = usePermissions();
  const canSend = hasPermission('user', 'read', 'all');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'users'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (canSend && target === 'users') {
      setUsersLoading(true);
      fetch('/api/users?limit=200')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.users) {
            setUsers(json.data.users);
          }
        })
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    } else if (target === 'all') {
      setSelectedUserIds([]);
    }
  }, [canSend, target]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (target === 'users' && selectedUserIds.length === 0) {
      setError('Select at least one user');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          target,
          userIds: target === 'users' ? selectedUserIds : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Sent to ${json.data?.recipients ?? 0} recipient(s)`);
        setTitle('');
        setBody('');
        setSelectedUserIds([]);
      } else {
        setError(json.message ?? 'Failed to send');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (!canSend) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell size={22} className="text-[#06B6D4]" />
          Notifications
        </h1>
        <div className="rounded-2xl border border-white/6 bg-[#161B22] p-8 text-center">
          <p className="text-[#8B949E]">You don&apos;t have permission to send notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell size={22} className="text-[#06B6D4]" />
          Send Notification
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">
          Send notifications to all users or specific users. Recipients can read them from the bell dropdown in the navbar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/6 bg-[#161B22] p-6 space-y-5 max-w-2xl">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New features available"
            className="w-full h-10 px-3 rounded-xl border border-white/6 bg-[#0D1117] text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#06B6D4]/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-wider mb-1.5">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your notification message..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-white/6 bg-[#0D1117] text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#06B6D4]/40 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-wider mb-2">
            Send to
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target"
                checked={target === 'all'}
                onChange={() => setTarget('all')}
                className="w-4 h-4 rounded-full border-white/6 bg-[#0D1117] text-[#06B6D4] focus:ring-[#06B6D4]/40"
              />
              <span className="text-sm text-white flex items-center gap-1.5">
                <Users size={14} />
                All users
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target"
                checked={target === 'users'}
                onChange={() => setTarget('users')}
                className="w-4 h-4 rounded-full border-white/6 bg-[#0D1117] text-[#06B6D4] focus:ring-[#06B6D4]/40"
              />
              <span className="text-sm text-white flex items-center gap-1.5">
                <User size={14} />
                Specific users
              </span>
            </label>
          </div>
        </div>

        {target === 'users' && (
          <div>
            <label className="block text-xs font-medium text-[#8B949E] uppercase tracking-wider mb-1.5">
              Select users
            </label>
            <div className="rounded-xl border border-white/6 bg-[#0D1117] max-h-48 overflow-y-auto p-2">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8 text-[#8B949E]">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-[#8B949E] text-center py-6">No users found</p>
              ) : (
                <div className="space-y-0.5">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="w-4 h-4 rounded border-white/6 bg-[#161B22] text-[#06B6D4] focus:ring-[#06B6D4]/40"
                      />
                      <span className="text-sm text-white">{u.name}</span>
                      <span className="text-xs text-[#8B949E]">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedUserIds.length > 0 && (
              <p className="text-xs text-[#8B949E] mt-1.5">
                {selectedUserIds.length} user(s) selected
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="cyan"
          size="md"
          disabled={loading || !title.trim() || (target === 'users' && selectedUserIds.length === 0)}
          className="gap-2"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Send Notification
        </Button>
      </form>
    </div>
  );
}
