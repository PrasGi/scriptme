'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'unread' | 'read';

interface FeedbackItem {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: string;
  readAt: string | null;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const { hasPermission } = usePermissions();
  const canView = hasPermission('user', 'read', 'all');

  const [list, setList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    const q = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    fetch(`/api/admin/feedback${q}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setList(json.data);
        else setList([]);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function markAsRead(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) fetchList();
    } finally {
      setMarkingId(null);
    }
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={22} className="text-[#06B6D4]" />
          Feedback
        </h1>
        <div className="rounded-2xl border border-white/6 bg-[#161B22] p-8 text-center">
          <p className="text-[#8B949E]">You don&apos;t have permission to view feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={22} className="text-[#06B6D4]" />
          User Feedback
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">
          Feedback submitted by users from the dashboard. Filter by status and mark as read.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-[#8B949E] shrink-0" />
        <span className="text-sm text-[#8B949E]">Status:</span>
        {(['all', 'unread', 'read'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === s
                ? 'bg-[#06B6D4] text-white'
                : 'bg-white/5 text-[#8B949E] hover:text-white hover:bg-white/10 border border-white/6'
            )}
          >
            {s === 'all' ? 'All' : s === 'unread' ? 'Unread' : 'Read'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/6 bg-[#161B22] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#8B949E]">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-[#8B949E] text-sm">
            No feedback {statusFilter !== 'all' ? `(${statusFilter})` : ''}.
          </div>
        ) : (
          <ul className="divide-y divide-white/6">
            {list.map((f) => (
              <li key={f._id} className={cn('p-4', f.status === 'unread' && 'bg-white/[0.02]')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-white">
                        {f.userName || 'Unknown'}
                        {f.userEmail && (
                          <span className="text-[#8B949E] font-normal ml-1">({f.userEmail})</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded uppercase',
                          f.status === 'unread'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-[#8B949E]'
                        )}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#E6EDF3] whitespace-pre-wrap break-words">{f.message}</p>
                    <p className="text-[10px] text-[#8B949E] mt-1.5">
                      {new Date(f.createdAt).toLocaleString()}
                      {f.readAt && ` · Read ${new Date(f.readAt).toLocaleString()}`}
                    </p>
                  </div>
                  {f.status === 'unread' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      disabled={markingId === f._id}
                      onClick={() => markAsRead(f._id)}
                    >
                      {markingId === f._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
