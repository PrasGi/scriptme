'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, FilePlus, Loader2, Link2, Bot, User, Send,
  Download, ChevronDown, Sparkles, BookOpen, UserCircle2, X, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseScriptLines, hasTimestampedScript } from '@/lib/parse-script';
import { ScriptLineEditor, type ScriptLine } from '@/components/script/script-line-editor';
import { ReadModeModal } from '@/components/script/read-mode-modal';
import ReactMarkdown from 'react-markdown';

interface CharacterOption {
  _id: string;
  name: string;
  description: string;
}

const EXPORT_FORMATS = [
  { value: 'txt', label: 'Plain Text (.txt)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'docx', label: 'Word (.docx)' },
];

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  done?: boolean;
}

export default function NewScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<ScriptLine[]>([
    { startTime: '00:00:00.000', endTime: '00:00:02.000', text: '' },
  ]);

  const [tiktokUrl, setTiktokUrl] = useState('');
  const [tiktokLang, setTiktokLang] = useState('');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokError, setTiktokError] = useState('');
  const [tiktokFetched, setTiktokFetched] = useState(false);
  const [pendingTikTokLines, setPendingTikTokLines] = useState<ScriptLine[] | null>(null);
  const [usedTiktokUrl, setUsedTiktokUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create-script limit (from plan): when false, disable Save and show message
  const [createScriptLimit, setCreateScriptLimit] = useState<{ allowed: boolean; used: number; limit: number | null } | null>(null);

  // Character
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [characterId, setCharacterId] = useState<string | null>(null);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Read mode
  const [readModeOpen, setReadModeOpen] = useState(false);

  // Chat with AI
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAppliedContent, setAiAppliedContent] = useState<string | null>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // TikTok fetch modal
  const [tiktokModalOpen, setTiktokModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((j) => { if (j.success && Array.isArray(j.data)) setCharacters(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/limits')
      .then((r) => r.json())
      .then((j) => { if (j.success && j.data?.save) setCreateScriptLimit(j.data.save); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/ai/session', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => { if (json.success) setAiSessionId(json.data.sessionId); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = aiChatEndRef.current;
    if (!el) return;
    const t = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(t);
  }, [aiMessages, aiLoading]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function serializeScriptContext(): string {
    const hasContent = lines.some((l) => l.text.trim());
    if (!hasContent) return '';
    return lines
      .map((l) => `${l.startTime} --> ${l.endTime}\n${l.text}`)
      .join('\n\n');
  }

  function getCharacterContext(): string | undefined {
    if (!characterId) return undefined;
    const c = characters.find((x) => x._id === characterId);
    if (!c) return undefined;
    return `Character name: ${c.name}\nDescription: ${c.description || '(no description)'}`;
  }

  async function sendAiMessageWithSession(sessionId: string, userMsg: string) {
    const scriptContext = serializeScriptContext();
    const mode = 'chat';

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: userMsg,
        mode,
        characterContext: getCharacterContext(),
        scriptContext: scriptContext || undefined,
        projectId,
      }),
    });
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let aiText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const rawLines = decoder.decode(value).split('\n');
      for (const line of rawLines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            aiText += data.chunk;
            setAiMessages((prev) => {
              const u = [...prev];
              u[u.length - 1] = { role: 'ai', content: aiText, done: false };
              return u;
            });
          }
          if (data.done) {
            setAiMessages((prev) => {
              const u = [...prev];
              u[u.length - 1] = { role: 'ai', content: aiText, done: true };
              return u;
            });
          }
          if (data.error) throw new Error(data.error);
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  }

  async function sendAiMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading || !aiSessionId) return;

    const userMsg = aiInput.trim();
    setAiInput('');
    setAiAppliedContent(null);
    setAiMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);
    setAiMessages((prev) => [...prev, { role: 'ai', content: '', done: false }]);

    try {
      await sendAiMessageWithSession(aiSessionId, userMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI error';
      const isSessionNotFound = typeof msg === 'string' && msg.includes('Session not found');
      if (isSessionNotFound) {
        try {
          const r = await fetch('/api/ai/session', { method: 'POST' });
          const json = await r.json();
          if (json.success && json.data?.sessionId) {
            setAiSessionId(json.data.sessionId);
            await sendAiMessageWithSession(json.data.sessionId, userMsg);
            return;
          }
        } catch { /* fall through */ }
      }
      setAiMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: 'ai', content: `Error: ${msg}`, done: true };
        return u;
      });
    } finally {
      setAiLoading(false);
    }
  }

  function hasExistingContent(): boolean {
    return lines.some((l) => l.text.trim());
  }

  async function fetchTikTok(e: React.FormEvent) {
    e.preventDefault();
    setTiktokLoading(true);
    setTiktokError('');
    setPendingTikTokLines(null);
    setTiktokFetched(false);

    try {
      const res = await fetch('/api/tiktok/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tiktokUrl.trim(), lang: tiktokLang }),
      });
      const json = await res.json();
      if (!json.success) {
        setTiktokError(json.message ?? 'Failed to fetch transcript');
      } else {
        const raw = json.data.raw as string;
        const parsed = parseScriptLines(raw);
        const fetchedLines = parsed.length > 0 ? parsed : [{ startTime: '00:00:00.000', endTime: '00:00:02.000', text: '' }];

        if (!title) setTitle(json.data.description?.slice(0, 60) ?? '');

        if (hasExistingContent()) {
          setPendingTikTokLines(fetchedLines);
          setTiktokFetched(true);
        } else {
          setLines(fetchedLines);
          setUsedTiktokUrl(tiktokUrl.trim());
        }
      }
    } catch {
      setTiktokError('Network error');
    } finally {
      setTiktokLoading(false);
    }
  }

  function applyReplace() {
    if (!pendingTikTokLines) return;
    setLines(pendingTikTokLines);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
  }

  function applyAddBottom() {
    if (!pendingTikTokLines) return;
    setLines([...lines, ...pendingTikTokLines]);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
  }

  function applyAddTop() {
    if (!pendingTikTokLines) return;
    setLines([...pendingTikTokLines, ...lines]);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
  }

  type SaveOptions = { action?: string; format?: string };

  async function saveScript(options?: SaveOptions): Promise<string | null> {
    if (!title.trim()) {
      setError('Please enter a title');
      return null;
    }
    const hasContent = lines.some((l) => l.text.trim());
    if (!hasContent) {
      setError('Add at least one script line');
      return null;
    }

    const plainText = lines.map((l) => l.text).join(' ');
    const sourceType = usedTiktokUrl ? 'tiktok' : 'manual';

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceType,
          sourceTiktokUrl: usedTiktokUrl,
          lines,
          plainText,
          characterId: characterId ?? null,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to save script');
        return null;
      }

      const scriptId = json.data._id as string;
      const params = new URLSearchParams();
      if (options?.action) params.set('action', options.action);
      if (options?.format) params.set('format', options.format);
      const query = params.toString();
      router.push(`/projects/${projectId}/scripts/${scriptId}${query ? `?${query}` : ''}`);
      return scriptId;
    } catch {
      setError('Network error — please try again');
      return null;
    } finally {
      setSaving(false);
    }
  }

  const canSave = title.trim() && lines.some((l) => l.text.trim());
  const atCreateScriptLimit = createScriptLimit && !createScriptLimit.allowed;

  /** Save first, then redirect to edit page with optional action. Shows error if can't save. */
  async function ensureSavedAndRedirect(action?: string, format?: string) {
    if (!canSave) {
      setError('Please add a title and at least one script line to use this feature');
      return;
    }
    await saveScript({ action, format });
  }

  return (
    <div className="flex flex-col gap-6 w-full lg:h-[calc(100vh-7rem)] lg:min-h-0">
      {atCreateScriptLimit && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Monthly script limit reached
          {createScriptLimit.limit != null && ` (${createScriptLimit.used}/${createScriptLimit.limit})`}.
          Upgrade your plan or try again next month.
        </div>
      )}
      {/* Header: full width */}
      <div className="flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FilePlus size={22} className="text-[#7C3AED]" />
              New Script
            </h1>
            <p className="text-sm text-[#8B949E] mt-0.5">Add a script to this project</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canSave || saving || !!atCreateScriptLimit}
            onClick={() => saveScript()}
            className="gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <div className="relative" ref={exportRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportOpen((v) => !v)}
              className="gap-1.5"
              disabled={saving || !!atCreateScriptLimit}
            >
              <Download size={13} />
              <ChevronDown size={12} />
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/8 bg-[#161B22] shadow-xl z-10 overflow-hidden">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setExportOpen(false);
                      ensureSavedAndRedirect('export', f.value);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#8B949E] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => ensureSavedAndRedirect('analyze')}
            disabled={!canSave || saving || lines.length === 0 || !!atCreateScriptLimit}
            className="gap-1.5"
          >
            <Sparkles size={13} />
            Analyze
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTiktokModalOpen(true)} className="gap-1.5">
            <Link2 size={13} />
            Fetch TikTok
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const res = await fetch('/api/usage/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'read_mode' }),
              });
              if (res.status === 403) {
                const json = await res.json().catch(() => ({}));
                setError(json.message ?? 'Monthly limit for read mode reached.');
                return;
              }
              if (!res.ok) return;
              setReadModeOpen(true);
            }}
            disabled={lines.length === 0}
            className="gap-1.5"
          >
            <BookOpen size={13} />
            Read mode
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Row 1 (Title, Character) + Row 2 (Chat with AI) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:max-w-[45%] order-last lg:order-first">
          {/* Row 1: Title + Character */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <div className="rounded-2xl border border-white/6 bg-[#0D1117] p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
                  Script Title <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Intro Hook — Morning Coffee"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#161B22] border-white/8"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/6 bg-[#0D1117] p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider flex items-center gap-2">
                  <UserCircle2 size={12} className="text-[#7C3AED]" />
                  Character
                </label>
                <select
                  value={characterId ?? ''}
                  onChange={(e) => setCharacterId(e.target.value || null)}
                  className="w-full h-10 rounded-xl border border-white/8 bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]/50"
                >
                  <option value="">None</option>
                  {characters.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#8B949E]">Used as context for AI.</p>
              </div>
            </div>
          </div>

          {/* Row 2: Chat with AI */}
          <div className="mt-6 rounded-2xl border border-white/6 bg-[#0D1117] overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-white/6 shrink-0">
              <h3 className="text-xs font-medium text-[#8B949E] uppercase tracking-wider flex items-center gap-2">
                <Bot size={12} className="text-[#7C3AED]" />
                Chat with AI
              </h3>
            </div>
            <div className="flex-1 min-h-64 overflow-y-auto p-3 space-y-2">
              {aiMessages.length === 0 && (
                <p className="text-xs text-[#8B949E]/70 text-center py-4">
                  Ask AI to generate or modify your script. Current script is sent as context.
                </p>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2 text-xs', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-[#7C3AED]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2',
                      msg.role === 'user' ? 'bg-[#7C3AED]/10 text-white border border-[#7C3AED]/20' : 'bg-white/4 text-[#E6EDF3] border border-white/6'
                    )}
                  >
                    {msg.role === 'ai' && msg.content ? (
                      <div className="text-[#E6EDF3] [&_*]:text-xs [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:first:mt-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.role === 'ai' && !msg.done ? (
                      <span className="flex items-center gap-1 text-[#8B949E]">
                        <Loader2 size={10} className="animate-spin" /> Thinking…
                      </span>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-white/6 flex items-center justify-center shrink-0">
                      <User size={12} className="text-[#8B949E]" />
                    </div>
                  )}
                </div>
              ))}
              {(() => {
                if (aiLoading) return null;
                const lastAi = [...aiMessages].reverse().find((m) => m.role === 'ai' && m.done);
                const content = lastAi?.content ?? '';
                const parsed = content ? parseScriptLines(content) : [];
                const canApply = parsed.length > 0 && hasTimestampedScript(content);
                const hasApplied = canApply && content === aiAppliedContent;
                if (!canApply) return null;
                if (hasApplied) {
                  return (
                    <div className="pt-2 flex justify-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <Check size={14} />
                        New script has been updated
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        const lastUser = [...aiMessages].reverse().find((m) => m.role === 'user');
                        const userText = (lastUser?.content ?? '').toLowerCase();
                        const isDeletion = /\b(delete|remove|keep only|drop)\b/.test(userText);
                        let merged: ScriptLine[];
                        if (parsed.length < lines.length && !isDeletion) {
                          // Partial edit: merge AI output into existing script by index
                          merged = lines.map((existing, i) =>
                            i < parsed.length
                              ? { ...parsed[i], flagColor: existing.flagColor ?? undefined }
                              : existing
                          );
                        } else {
                          merged = parsed.map((line, i) => ({
                            ...line,
                            flagColor: lines[i]?.flagColor ?? undefined,
                          }));
                        }
                        setLines(merged);
                        setAiAppliedContent(content);
                      }}
                    >
                      Apply to script
                    </Button>
                  </div>
                );
              })()}
              <div ref={aiChatEndRef} />
            </div>
            <form onSubmit={sendAiMessage} className="p-2 border-t border-white/6 shrink-0">
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={aiSessionId ? 'Ask AI…' : 'Initializing…'}
                  disabled={!aiSessionId || aiLoading}
                  className="flex-1 h-8 px-3 rounded-lg border border-white/8 bg-[#161B22] text-xs text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#7C3AED]/50 disabled:opacity-50"
                />
                <Button type="submit" variant="accent" size="sm" disabled={!aiSessionId || aiLoading || !aiInput.trim()} className="h-8 px-3 shrink-0">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </Button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mt-4 shrink-0">
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
            </div>
          )}
        </div>

        {/* Right: Script editor */}
        <aside className="w-full lg:min-w-[55%] lg:flex-1 shrink-0 order-first lg:order-last flex flex-col min-h-0">
          <div className="mt-6 flex-1 min-h-0 flex flex-col">
            <div className="rounded-2xl border border-white/6 bg-[#0D1117] p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
              <p className="text-xs text-[#8B949E] shrink-0 mb-3">
                Add lines with timestamps and script text. Use &quot;Add line&quot; for new blocks.
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ScriptLineEditor lines={lines} onChange={setLines} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ReadModeModal
        isOpen={readModeOpen}
        onClose={() => setReadModeOpen(false)}
        title={title || 'Script'}
        lines={lines}
      />

      {/* Fetch TikTok modal */}
      {tiktokModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#0D1117] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Link2 size={15} className="text-[#7C3AED]" />
                Fetch from TikTok URL
              </h2>
              <button
                onClick={() => { setTiktokModalOpen(false); setTiktokError(''); }}
                className="text-[#8B949E] hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={fetchTikTok} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">TikTok URL</label>
                <Input
                  placeholder="https://www.tiktok.com/@user/video/..."
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="bg-[#161B22] border-white/8 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">Language</label>
                <select
                  value={tiktokLang}
                  onChange={(e) => setTiktokLang(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/8 bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]/50"
                >
                  <option value="">Auto</option>
                  <option value="eng">English (eng)</option>
                  <option value="ind">Indonesian (ind)</option>
                  <option value="jpn">Japanese (jpn)</option>
                  <option value="kor">Korean (kor)</option>
                  <option value="zho">Chinese (zho)</option>
                  <option value="spa">Spanish (spa)</option>
                  <option value="por">Portuguese (por)</option>
                </select>
              </div>
              {tiktokError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{tiktokError}</p>
              )}
              {tiktokFetched && pendingTikTokLines ? (
                <div className="space-y-2 pt-2 border-t border-white/6">
                  <span className="text-xs text-[#8B949E] block">Transcript fetched. Choose how to use it:</span>
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="secondary" size="sm" onClick={applyReplace} className="w-full justify-center">Replace script</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={applyAddBottom} className="w-full justify-center">Add on bottom</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={applyAddTop} className="w-full justify-center">Add on top</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button type="submit" variant="accent" disabled={tiktokLoading || !tiktokUrl.trim()} className="gap-2">
                    {tiktokLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    {tiktokLoading ? 'Fetching…' : 'Fetch'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setTiktokModalOpen(false)} disabled={tiktokLoading}>
                    Cancel
                  </Button>
                </div>
              )}
            </form>
            {usedTiktokUrl && !tiktokFetched && (
              <div className="px-5 pb-5">
                <p className="text-xs text-[#8B949E] truncate" title={usedTiktokUrl}>
                  Source: {usedTiktokUrl}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
