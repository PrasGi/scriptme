'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Bot, ChevronDown, Loader2, MessageSquare,
  Calendar, Filter, Coins, Hash, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsCard } from '@/components/dashboard/stats-card';

interface AiLog {
  _id:           string;
  userId:        { _id: string; name: string; email: string } | string;
  sessionId:     string;
  mode:          'generate' | 'analyze' | 'regenerate' | 'chat';
  message:       string;
  response:      string;
  projectId?:    string;
  scriptId?:     string;
  inputTokens?:  number;
  outputTokens?: number;
  totalTokens?:  number;
  costUsd?:      number;
  createdAt:     string;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface Summary {
  totalRequests:     number;
  totalInputTokens:  number;
  totalOutputTokens: number;
  totalTokens:       number;
  totalCostUsd:      number;
}

interface UserOption {
  id:    string;
  name:  string;
  email: string;
}

const MODE_LABELS: Record<string, string> = {
  generate:   'Generate',
  analyze:    'Analyze',
  regenerate: 'Regenerate',
  chat:       'Chat',
};

const MODE_VARIANTS: Record<string, 'default' | 'accent' | 'green' | 'orange' | 'purple'> = {
  generate:   'accent',
  analyze:    'orange',
  regenerate: 'purple',
  chat:       'green',
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function userName(u: AiLog['userId']): string {
  if (typeof u === 'string') return '—';
  return u?.name ?? u?.email ?? '—';
}

function userEmail(u: AiLog['userId']): string {
  if (typeof u === 'string') return '';
  return u?.email ?? '';
}

function truncate(s: string, len: number) {
  if (!s) return '—';
  return s.length <= len ? s : s.slice(0, len) + '…';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(c: number): string {
  if (c < 0.001) return '<$0.001';
  if (c < 0.01) return `$${c.toFixed(4)}`;
  return `$${c.toFixed(3)}`;
}

function getCurrentMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function AiUsagePage() {
  const [logs,        setLogs]        = useState<AiLog[]>([]);
  const [pagination,  setPagination]  = useState<Pagination | null>(null);
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [users,       setUsers]       = useState<UserOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [page,        setPage]        = useState(1);
  const [modeFilter,  setModeFilter]  = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate,   setStartDate]   = useState(() => getCurrentMonthBounds().start);
  const [endDate,     setEndDate]     = useState(() => getCurrentMonthBounds().end);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (modeFilter) params.set('mode', modeFilter);
    if (userIdFilter) params.set('userId', userIdFilter);
    fetch(`/api/admin/ai-usage?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLogs(json.data.logs ?? []);
          setPagination(json.data.pagination ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, modeFilter, userIdFilter]);

  const fetchSummary = useCallback(() => {
    setSummaryLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (modeFilter) params.set('mode', modeFilter);
    if (userIdFilter) params.set('userId', userIdFilter);
    fetch(`/api/admin/ai-usage/summary?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.data.summary ?? null);
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [startDate, endDate, modeFilter, userIdFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.users) {
          setUsers(json.data.users.map((u: { id: string; name: string; email: string }) => ({
            id: u.id,
            name: u.name || u.email || '—',
            email: u.email || '',
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bot size={22} className="text-[#7C3AED]" />
          AI Usage
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          All AI chat interactions with token usage and cost (Gemini 2.5 Flash)
        </p>
      </div>

      {/* Summary widget with filters */}
      <div className="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-md overflow-hidden shadow-sm shadow-slate-200/20">
        <div className="px-5 py-4 border-b border-slate-200/50 flex items-center gap-2 bg-white/80">
          <BarChart3 size={18} className="text-[#7C3AED]" />
          <span className="text-sm font-medium text-slate-800">Summary</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <span className="text-xs text-slate-500">Filters:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg text-xs bg-white/80 border border-slate-200/60 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#7C3AED]/50"
                placeholder="From"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg text-xs bg-white/80 border border-slate-200/60 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#7C3AED]/50"
                placeholder="To"
              />
              <select
                value={modeFilter}
                onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg text-xs bg-white/80 border border-slate-200/60 text-slate-800 focus:outline-none focus:border-[#7C3AED]/50"
              >
                <option value="">All modes</option>
                {Object.entries(MODE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={userIdFilter}
                onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg text-xs bg-white/80 border border-slate-200/60 text-slate-800 focus:outline-none focus:border-[#7C3AED]/50 min-w-[160px]"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total requests"
                value={summary.totalRequests.toLocaleString()}
                icon={MessageSquare}
                accent="#7C3AED"
              />
              <StatsCard
                title="Input tokens"
                value={formatTokens(summary.totalInputTokens)}
                icon={Hash}
                accent="#8B949E"
              />
              <StatsCard
                title="Output tokens"
                value={formatTokens(summary.totalOutputTokens)}
                icon={Hash}
                accent="#8B949E"
              />
              <StatsCard
                title="Estimated cost"
                value={formatCost(summary.totalCostUsd)}
                icon={Coins}
                accent="#22C55E"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4">No summary data</p>
          )}
        </div>
      </div>

      {/* Log list filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500">Mode:</span>
        </div>
        {(['', 'generate', 'analyze', 'regenerate', 'chat'] as const).map((m) => (
          <button
            key={m || 'all'}
            onClick={() => { setModeFilter(m); setPage(1); }}
            className={cn(
              'px-3 h-8 rounded-lg text-xs font-medium border transition-all',
              modeFilter === m
                ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#7C3AED]'
                : 'bg-white/70 border-slate-200/50 text-slate-600 hover:text-slate-800'
            )}
          >
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-md overflow-hidden shadow-sm shadow-slate-200/20">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>No AI usage recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/40">
            {logs.map((log) => {
              const isExpanded = expandedId === log._id;
              const inputT  = log.inputTokens ?? 0;
              const outputT = log.outputTokens ?? 0;
              const cost   = log.costUsd ?? 0;
              return (
                <div key={log._id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log._id)}
                    className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-slate-800">{userName(log.userId)}</span>
                        {userEmail(log.userId) && (
                          <span className="text-xs text-slate-500">{userEmail(log.userId)}</span>
                        )}
                        <Badge variant={MODE_VARIANTS[log.mode] ?? 'default'}>
                          {MODE_LABELS[log.mode] ?? log.mode}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {truncate(log.message, 120)}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(log.createdAt)}
                        </span>
                        <span className="flex items-center gap-1" title="Input / output tokens">
                          <Hash size={11} />
                          {formatTokens(inputT)} in · {formatTokens(outputT)} out
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600" title="Estimated cost">
                          <Coins size={11} />
                          {formatCost(cost)}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={cn('text-slate-500 shrink-0 mt-1 transition-transform', isExpanded && 'rotate-180')}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200/40 px-5 py-4 bg-slate-50/60 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          <div className="text-slate-500 mb-0.5">Input tokens</div>
                          <div className="font-mono text-slate-800">{inputT.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          <div className="text-slate-500 mb-0.5">Output tokens</div>
                          <div className="font-mono text-slate-800">{outputT.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          <div className="text-slate-500 mb-0.5">Total tokens</div>
                          <div className="font-mono text-slate-800">{(inputT + outputT).toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          <div className="text-slate-500 mb-0.5">Est. cost (USD)</div>
                          <div className="font-mono text-emerald-600">{formatCost(cost)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1.5">User Input</div>
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          {log.message || '—'}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1.5">AI Response</div>
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded-lg bg-white/80 border border-slate-200/50 p-3">
                          {log.response || '—'}
                        </pre>
                      </div>
                      {(log.projectId || log.scriptId) && (
                        <div className="text-xs text-slate-500">
                          Project: {log.projectId ?? '—'} · Script: {log.scriptId ?? '—'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/50">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 h-8 rounded-lg text-xs font-medium border border-slate-200/60 text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 h-8 rounded-lg text-xs font-medium border border-slate-200/60 text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
