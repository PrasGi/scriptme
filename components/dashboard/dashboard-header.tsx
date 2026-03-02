'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, FolderOpen, FileText, Users, Loader2, MessageSquare, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { Tooltip } from '@/components/ui/tooltip';
import { FeedbackModal } from './feedback-modal';
import { useSidebar } from '@/contexts/sidebar-context';

interface SearchResult {
  projects: { _id: string; title: string; href: string; type: string }[];
  scripts: { _id: string; title: string; href: string; type: string }[];
  characters: { _id: string; name: string; href: string; type: string }[];
}

export function DashboardHeader() {
  const { hasPermission } = usePermissions();
  const { setMobileOpen } = useSidebar();
  const canSendNotif = hasPermission('user', 'read', 'all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ _id: string; title: string; body: string; readAt: string | null; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success && json.data) setResults(json.data);
      else setResults(null);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function fetchNotifications() {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setNotifications(json.data);
          setUnreadCount(json.data.filter((n: { readAt: string | null }) => !n.readAt).length);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    fetchNotifications();
  }

  const hasResults = results && (results.projects.length > 0 || results.scripts.length > 0 || results.characters.length > 0);

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl flex items-center justify-between gap-2 pl-3 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 sticky top-0 z-30 shadow-sm shadow-slate-200/10 min-w-0 w-full">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      {/* Search — narrow on small screens so right icons stay visible */}
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-44 sm:max-w-sm relative" ref={searchRef}>
        <div className="flex items-center gap-1.5 sm:gap-2 h-9 w-full min-w-0 rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-sm pl-2.5 pr-2 sm:px-3 text-slate-500 focus-within:border-[#7C3AED]/40 focus-within:bg-white/80 transition-colors">
          <Search size={15} className="shrink-0" />
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="flex-1 min-w-12 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
        </div>
        {open && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-300/30 py-2 z-50 max-h-80 overflow-y-auto">
            {loading && !results ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : !hasResults ? (
              <p className="px-4 py-3 text-sm text-slate-500">No results found</p>
            ) : (
              <>
                {results!.projects.length > 0 && (
                  <div className="px-2 py-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Projects</p>
                    {results!.projects.map((p) => (
                      <Link
                        key={p._id}
                        href={p.href}
                        onClick={() => { setOpen(false); setQuery(''); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100/80 transition-colors"
                      >
                        <FolderOpen size={14} className="text-[#7C3AED] shrink-0" />
                        {p.title}
                      </Link>
                    ))}
                  </div>
                )}
                {results!.scripts.length > 0 && (
                  <div className="px-2 py-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Scripts</p>
                    {results!.scripts.map((s) => (
                      <Link
                        key={s._id}
                        href={s.href}
                        onClick={() => { setOpen(false); setQuery(''); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100/80 transition-colors"
                      >
                        <FileText size={14} className="text-[#7C3AED] shrink-0" />
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
                {results!.characters.length > 0 && (
                  <div className="px-2 py-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Characters</p>
                    {results!.characters.map((c) => (
                      <Link
                        key={c._id}
                        href={c.href}
                        onClick={() => { setOpen(false); setQuery(''); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100/80 transition-colors"
                      >
                        <Users size={14} className="text-[#7C3AED] shrink-0" />
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right — always keep visible with shrink-0 */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0" ref={notifRef}>
        <Tooltip content="Feedback" description="Send feedback to the team" side="bottom">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="w-9 h-9 rounded-xl border border-slate-200/60 bg-white/60 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-all"
          >
            <MessageSquare size={16} />
          </button>
        </Tooltip>
        <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        <Tooltip content="Notifications" description="View and manage your notifications" side="bottom">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative w-9 h-9 rounded-xl border border-slate-200/60 bg-white/60 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-all"
          >
            <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#7C3AED] text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          </button>
        </Tooltip>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-300/30 py-2 z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-200/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              {canSendNotif && (
                <Tooltip content="Send notifications" description="Open admin panel to send notifications to users" side="left">
                  <Link
                    href="/admin/notifications"
                    className="text-xs text-[#7C3AED] hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    Admin: Send
                  </Link>
                </Tooltip>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => markAsRead(n._id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-100/60 transition-colors border-b border-slate-200/40 last:border-0 ${
                      n.readAt ? 'opacity-70' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleDateString()}
                      {n.readAt ? ' · Read' : ' · Unread'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
