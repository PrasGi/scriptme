'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Loader2, Link2, Bot, User, Send, Save, Sparkles,
  Download, ChevronDown, Check, AlertTriangle, X, Trash2, BookOpen, UserCircle2, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { parseScriptLines, hasTimestampedScript } from '@/lib/parse-script';
import { ScriptLineEditor, type ScriptLine, type AnalyzeLine } from '@/components/script/script-line-editor';
import { ReadModeModal } from '@/components/script/read-mode-modal';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  done?: boolean;
}

interface CharacterOption {
  _id:          string;
  name:         string;
  description:  string;
}

interface Script {
  _id:           string;
  title:         string;
  status:        'draft' | 'analyzing' | 'ready';
  sourceType:    string;
  sourceTiktokUrl?: string;
  characterId:   string | null;
  lines:         ScriptLine[];
  plainText:     string;
  analyzeResult: AnalyzeLine[] | null;
  updatedAt:     string;
}

const EXPORT_FORMATS = [
  { value: 'txt',  label: 'Plain Text (.txt)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'pdf',  label: 'PDF (.pdf)' },
];

export default function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id: projectId, sid } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [script, setScript] = useState<Script | null>(null);
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');

  // Character
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [characterId, setCharacterId] = useState<string | null>(null);

  // TikTok (same as new script)
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [tiktokLang, setTiktokLang] = useState('');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokError, setTiktokError] = useState('');
  const [tiktokFetched, setTiktokFetched] = useState(false);
  const [pendingTikTokLines, setPendingTikTokLines] = useState<ScriptLine[] | null>(null);
  const [usedTiktokUrl, setUsedTiktokUrl] = useState('');

  // Chat with AI
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAppliedContent, setAiAppliedContent] = useState<string | null>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // Analyze
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeLine[] | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [implementingItem, setImplementingItem] = useState<AnalyzeLine | null>(null);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // TikTok fetch modal
  const [tiktokModalOpen, setTiktokModalOpen] = useState(false);

  // Read mode
  const [readModeOpen, setReadModeOpen] = useState(false);

  // Track last saved state to avoid saving on load; enable auto-save for flag colors
  const lastSavedRef = useRef<string | null>(null);
  const actionHandledRef = useRef(false);

  // Undo/redo: history of script line states (debounced for editor; immediate for discrete actions)
  const linesRef = useRef<ScriptLine[]>(lines);
  const historyRef = useRef<ScriptLine[][]>([]);
  const redoRef = useRef<ScriptLine[][]>([]);
  const lastPushTimeRef = useRef(0);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const UNDO_DEBOUNCE_MS = 800;
  const MAX_UNDO_HISTORY = 50;
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  function pushHistory() {
    const now = Date.now();
    if (now - lastPushTimeRef.current < UNDO_DEBOUNCE_MS && historyRef.current.length > 0) return;
    const cur = linesRef.current;
    if (cur.length === 0 && historyRef.current.length === 0) return;
    historyRef.current = [...historyRef.current, cur].slice(-MAX_UNDO_HISTORY);
    redoRef.current = [];
    setRedoAvailable(false);
    lastPushTimeRef.current = now;
    setUndoAvailable(true);
  }

  function handleEditorChange(newLines: ScriptLine[]) {
    pushHistory();
    setLines(newLines);
  }

  function handleUndo() {
    if (historyRef.current.length === 0) return;
    redoRef.current = [...redoRef.current, linesRef.current];
    setRedoAvailable(true);
    const prev = historyRef.current.pop()!;
    setUndoAvailable(historyRef.current.length > 0);
    lastPushTimeRef.current = 0;
    setLines(prev);
  }

  function handleRedo() {
    if (redoRef.current.length === 0) return;
    historyRef.current = [...historyRef.current, linesRef.current].slice(-MAX_UNDO_HISTORY);
    setUndoAvailable(true);
    const next = redoRef.current.pop()!;
    setRedoAvailable(redoRef.current.length > 0);
    lastPushTimeRef.current = 0;
    setLines(next);
  }

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((j) => { if (j.success && Array.isArray(j.data)) setCharacters(j.data); })
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

  // Load script
  useEffect(() => {
    fetch(`/api/projects/${projectId}/scripts/${sid}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setScript(json.data);
        setTitle(json.data.title ?? '');
        setLines(json.data.lines ?? []);
        setCharacterId(json.data.characterId ?? null);
        setAnalyzeResult(json.data.analyzeResult ?? null);
        setUsedTiktokUrl(json.data.sourceTiktokUrl ?? '');
        if (json.data.status === 'analyzing') setAnalyzing(true);
        lastSavedRef.current = JSON.stringify(json.data.lines ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, sid]);

  // Auto-save when lines change (e.g. flag colors) — debounced
  useEffect(() => {
    if (loading || saving) return;
    const payload = JSON.stringify(lines);
    if (payload === lastSavedRef.current) return;
    if (!title.trim() || !lines.some((l) => l.text.trim())) return;

    const t = setTimeout(() => {
      const plainText = lines.map((l) => l.text).join(' ');
      fetch(`/api/projects/${projectId}/scripts/${sid}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lines, plainText }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) lastSavedRef.current = JSON.stringify(lines);
        })
        .catch(() => {});
    }, 800);

    return () => clearTimeout(t);
  }, [lines, title, loading, saving, projectId, sid]);

  // Poll when status is 'analyzing' (e.g. after refresh during analysis)
  useEffect(() => {
    if (!script || script.status !== 'analyzing' || !analyzing) return;

    const pollInterval = 2000;
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      const r = await fetch(`/api/projects/${projectId}/scripts/${sid}`);
      const j = await r.json();
      if (!j.success) return;

      const status = j.data?.status;
      const result = j.data?.analyzeResult ?? null;

      if (status === 'ready' && result) {
        setAnalyzeResult(result);
        setScript((prev) => prev ? { ...prev, status: 'ready', analyzeResult: result } : null);
        setAnalyzing(false);
        return;
      }

      if (status === 'draft') {
        setAnalyzing(false);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) setTimeout(poll, pollInterval);
      else setAnalyzing(false);
    };

    const t = setTimeout(poll, pollInterval);
    return () => clearTimeout(t);
  }, [script?.status, analyzing, projectId, sid]);

  // Handle ?action= and ?format= from new-script auto-save redirect
  useEffect(() => {
    if (loading || !script || actionHandledRef.current) return;
    const action = searchParams.get('action');
    if (!action) return;
    actionHandledRef.current = true;
    const format = searchParams.get('format') || 'txt';
    router.replace(`/projects/${projectId}/scripts/${sid}`);
    if (action === 'analyze') runAnalyze();
    else if (action === 'export') window.open(`/api/projects/${projectId}/scripts/${sid}/export?format=${format}`, '_blank');
  }, [loading, script, projectId, sid, searchParams, router]);

  /** Serialize script for AI: line numbers (1-based) and current flag per line so AI can read/update flags. */
  function serializeScriptContext(): string {
    const hasContent = lines.some((l) => l.text.trim());
    if (!hasContent) return '';
    const header = [
      '[CURRENT SCRIPT]',
      'Lines are numbered from 1. "Line N" means the N-th script line. Each line may have an optional flag (hex color).',
      '',
    ].join('\n');
    const body = lines
      .map((l, i) => {
        const lineNum = i + 1;
        const flagLabel = l.flagColor ? `(flag: ${l.flagColor})` : '(no flag)';
        return `Line ${lineNum} ${flagLabel}\n${l.startTime} --> ${l.endTime}\n${l.text}`;
      })
      .join('\n\n');
    return header + body;
  }

  async function onCharacterChange(newId: string | null) {
    setCharacterId(newId);
    try {
      await fetch(`/api/projects/${projectId}/scripts/${sid}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ characterId: newId }),
      });
      setScript((prev) => (prev ? { ...prev, characterId: newId } : null));
    } catch { /* ignore */ }
  }

  function getCharacterContext(): string | undefined {
    if (!characterId) return undefined;
    const c = characters.find((x) => x._id === characterId);
    if (!c) return undefined;
    return `Character name: ${c.name}\nDescription: ${c.description || '(no description)'}`;
  }

  /** Strip the flag-updates JSON code block from AI message for display (avoids long unbroken text breaking layout). */
  function messageContentForDisplay(aiText: string): string {
    return aiText
      .replace(/```[\s\S]*?```/g, (block) => (block.includes('flagUpdates') ? '' : block))
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /** Parse AI response for flag updates JSON block. Returns null if none found. */
  function parseFlagUpdatesFromAiResponse(aiText: string): { lineIndex: number; color: string | null }[] | null {
    const jsonBlock = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!jsonBlock) return null;
    try {
      const parsed = JSON.parse(jsonBlock[1].trim()) as { flagUpdates?: { lineIndex: number; color: string | null }[] };
      if (!Array.isArray(parsed?.flagUpdates) || parsed.flagUpdates.length === 0) return null;
      return parsed.flagUpdates;
    } catch {
      return null;
    }
  }

  /** Apply flag updates to a copy of lines (0-based lineIndex). */
  function applyFlagUpdatesToLines(
    currentLines: ScriptLine[],
    updates: { lineIndex: number; color: string | null }[]
  ): ScriptLine[] {
    const next = currentLines.map((l) => ({ ...l }));
    for (const { lineIndex, color } of updates) {
      if (lineIndex < 0 || lineIndex >= next.length) continue;
      next[lineIndex] = { ...next[lineIndex], flagColor: color == null ? undefined : color };
    }
    return next;
  }

  /** Parse 1-based line numbers from user message (e.g. "line 18", "lines 5, 6 and 15"). */
  function parseLineNumbersFromUserMessage(userMessage: string): number[] {
    const text = userMessage.trim();
    if (!text) return [];
    // Match "line 18", "line 1", "lines 5, 6 and 15", "lines 5 6 15", etc.
    const single = text.match(/\bline\s+(\d+)\b/i);
    if (single) {
      const rest = text.replace(/\bline\s+\d+\b/gi, '').trim();
      const more = rest.match(/\b(\d+)\b/g);
      const first = parseInt(single[1], 10);
      const others = (more ?? [])
        .map((n) => parseInt(n, 10))
        .filter((n) => n !== first && n >= 1);
      return [first, ...others].filter((n, i, a) => a.indexOf(n) === i).sort((a, b) => a - b);
    }
    const multi = text.match(/\blines\s+([\d,\s]+(?:and\s+)?\d+)\b/i);
    if (multi) {
      const nums = multi[1].replace(/\band\s+/gi, ',').split(/[\s,]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n >= 1);
      return [...new Set(nums)].sort((a, b) => a - b);
    }
    const anyNum = text.match(/\b(\d+)\b/);
    if (anyNum && text.toLowerCase().includes('line')) {
      return [parseInt(anyNum[1], 10)];
    }
    return [];
  }

  async function sendAiMessageWithSession(
    sessionId: string,
    userMsg: string,
    onSuccess?: (aiText: string) => void
  ) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: userMsg,
        mode: 'chat',
        characterContext: getCharacterContext(),
        scriptContext: serializeScriptContext() || undefined,
        projectId,
        scriptId: sid,
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
            onSuccess?.(aiText);
          }
          if (data.error) throw new Error(data.error);
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  }

  function pushHistoryForAction() {
    lastPushTimeRef.current = 0;
    pushHistory();
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
      await ensureSaved();
      await sendAiMessageWithSession(aiSessionId, userMsg, (aiText) => {
        const updates = parseFlagUpdatesFromAiResponse(aiText);
        if (updates?.length) {
          pushHistoryForAction();
          setLines((prev) => applyFlagUpdatesToLines(prev, updates));
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI error';
      const isSessionNotFound = typeof msg === 'string' && msg.includes('Session not found');
      if (isSessionNotFound) {
        try {
          const r = await fetch('/api/ai/session', { method: 'POST' });
          const json = await r.json();
          if (json.success && json.data?.sessionId) {
            setAiSessionId(json.data.sessionId);
            await sendAiMessageWithSession(json.data.sessionId, userMsg, (aiText) => {
              const updates = parseFlagUpdatesFromAiResponse(aiText);
              if (updates?.length) {
                pushHistoryForAction();
                setLines((prev) => applyFlagUpdatesToLines(prev, updates));
              }
            });
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

        if (!title.trim()) setTitle(json.data.description?.slice(0, 60) ?? '');

        if (hasExistingContent()) {
          setPendingTikTokLines(fetchedLines);
          setTiktokFetched(true);
        } else {
          setLines(fetchedLines);
          setUsedTiktokUrl(tiktokUrl.trim());
          setTiktokModalOpen(false);
        }
      }
    } catch {
      setTiktokError('Network error');
    } finally {
      setTiktokLoading(false);
    }
  }

  async function deleteSuggestion(item: AnalyzeLine) {
    const next = (analyzeResult ?? []).filter(
      (a) => !(a.lineIndex === item.lineIndex && a.suggestion === item.suggestion)
    );
    setAnalyzeResult(next.length > 0 ? next : null);

    try {
      await fetch(`/api/projects/${projectId}/scripts/${sid}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analyzeResult: next.length > 0 ? next : null }),
      });
    } catch {
      setAnalyzeResult(analyzeResult);
    }
  }

  async function deleteAllSuggestions() {
    setAnalyzeResult(null);

    try {
      await fetch(`/api/projects/${projectId}/scripts/${sid}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analyzeResult: null }),
      });
    } catch {
      setAnalyzeResult(analyzeResult);
    }
  }

  function applyReplace() {
    if (!pendingTikTokLines) return;
    pushHistoryForAction();
    setLines(pendingTikTokLines);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
    setTiktokModalOpen(false);
  }

  function applyAddBottom() {
    if (!pendingTikTokLines) return;
    pushHistoryForAction();
    setLines([...lines, ...pendingTikTokLines]);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
    setTiktokModalOpen(false);
  }

  function applyAddTop() {
    if (!pendingTikTokLines) return;
    pushHistoryForAction();
    setLines([...pendingTikTokLines, ...lines]);
    setUsedTiktokUrl(tiktokUrl.trim());
    setPendingTikTokLines(null);
    setTiktokModalOpen(false);
  }

  async function saveScript(): Promise<boolean> {
    if (!title.trim()) {
      setError('Please enter a title');
      return false;
    }
    const hasContent = lines.some((l) => l.text.trim());
    if (!hasContent) {
      setError('Add at least one script line');
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const plainText = lines.map((l) => l.text).join(' ');
      const res = await fetch(`/api/projects/${projectId}/scripts/${sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), lines, plainText }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to save');
        return false;
      } else {
        setSaveOk(true);
        setScript((prev) => prev ? { ...prev, ...json.data } : null);
        lastSavedRef.current = JSON.stringify(lines);
        setTimeout(() => setSaveOk(false), 2000);
        return true;
      }
    } catch {
      setError('Network error — please try again');
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Save if unsaved, so chat/analyze/read mode have the latest script. Returns true if OK to proceed. */
  async function ensureSaved(): Promise<boolean> {
    if (loading || saving) return true;
    const payload = JSON.stringify(lines);
    if (payload === lastSavedRef.current) return true;
    if (!title.trim() || !lines.some((l) => l.text.trim())) return true;
    return saveScript();
  }

  async function runAnalyze() {
    const ok = await ensureSaved();
    if (!ok) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalyzeResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts/${sid}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lines }),
      });
      const json = await res.json();

      if (!json.success) {
        setAnalyzeError(json.message ?? 'Failed to queue analysis');
        setAnalyzing(false);
        return;
      }

      const pollInterval = 2000;
      const maxAttempts = 60;
      let attempts = 0;

      const poll = async () => {
        const r = await fetch(`/api/projects/${projectId}/scripts/${sid}`);
        const j = await r.json();
        if (!j.success) return;

        const status = j.data?.status;
        const result = j.data?.analyzeResult ?? null;

        if (status === 'ready' && result) {
          setAnalyzeResult(result);
          setScript((prev) => prev ? { ...prev, status: 'ready', analyzeResult: result } : null);
          setAnalyzing(false);
          return;
        }

        if (status === 'draft' && attempts > 0) {
          setAnalyzeError('Analysis failed');
          setAnalyzing(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          setAnalyzeError('Analysis timed out');
          setAnalyzing(false);
        }
      };

      setTimeout(poll, pollInterval);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzing(false);
    }
  }

  async function implementSuggestion(item: AnalyzeLine) {
    if (implementingItem) return;

    const scriptContext = serializeScriptContext();
    if (!scriptContext) return;

    setImplementingItem(item);

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts/${sid}/implement`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          lineIndex:    item.lineIndex,
          suggestion:   item.suggestion,
          text:         item.text,
          scriptContext,
        }),
      });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full   = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        if (!done) buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6).trim());
            if (data.chunk) full += data.chunk;
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
        if (done) break;
      }

      if (hasTimestampedScript(full)) {
        const parsed = parseScriptLines(full);
        if (parsed.length > 0) {
          const merged = parsed.map((line, i) => ({
            ...line,
            flagColor: lines[i]?.flagColor ?? line.flagColor,
          }));
          pushHistoryForAction();
          setLines(merged);
          lastSavedRef.current = JSON.stringify(merged);

          const next = (analyzeResult ?? []).filter(
            (a) => !(a.lineIndex === item.lineIndex && a.suggestion === item.suggestion)
          );
          setAnalyzeResult(next.length > 0 ? next : null);
          setScript((prev) => prev ? { ...prev, lines: merged, analyzeResult: next.length > 0 ? next : null } : null);

          await fetch(`/api/projects/${projectId}/scripts/${sid}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              lines:         merged,
              plainText:     merged.map((l) => l.text).join(' '),
              analyzeResult: next.length > 0 ? next : null,
            }),
          });
        }
      }
    } catch (err) {
      console.error('Implement failed:', err);
    } finally {
      setImplementingItem(null);
    }
  }

  function exportScript(format: string) {
    setExportOpen(false);
    window.open(`/api/projects/${projectId}/scripts/${sid}/export?format=${format}`, '_blank');
  }

  const canSave = title.trim() && lines.some((l) => l.text.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="text-center py-32">
        <p className="text-[#8B949E]">Script not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push(`/projects/${projectId}`)}>
          Back to Project
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full lg:h-[calc(100vh-7rem)] lg:min-h-0">
      {/* Header: full width */}
      <div className="flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <Tooltip content="Back to project" description="Return to the project overview" side="bottom">
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/5 transition-all"
              >
                <ArrowLeft size={18} />
              </button>
            </Tooltip>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Save size={22} className="text-[#7C3AED]" />
                Edit Script
              </h1>
              <p className="text-sm text-[#8B949E] mt-0.5 flex items-center gap-2">
                {lines.length} lines
                <Badge variant={script.status === 'ready' ? 'accent' : script.status === 'analyzing' ? 'orange' : 'default'} className="text-[10px]">
                  {script.status}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content="Save" description="Save your script changes" side="bottom">
              <Button
                variant="secondary"
                size="sm"
                onClick={saveScript}
                disabled={saving || !canSave}
                className="gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : saveOk ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
                {saveOk ? 'Saved!' : 'Save'}
              </Button>
            </Tooltip>
            <div className="relative" ref={exportRef}>
              <Tooltip content="Export" description="Download as TXT, JSON, Word, or PDF" side="bottom">
                <Button variant="ghost" size="sm" onClick={() => setExportOpen((v) => !v)} className="gap-1.5">
                  <Download size={13} />
                  <ChevronDown size={12} />
                </Button>
              </Tooltip>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/8 bg-[#161B22] shadow-xl z-10 overflow-hidden">
                  {EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => exportScript(f.value)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#8B949E] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Tooltip content="Analyze" description="Get AI feedback and suggestions for each line" side="bottom">
              <Button variant="ghost" size="sm" onClick={runAnalyze} disabled={analyzing || lines.length === 0} className="gap-1.5">
                {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Analyze
              </Button>
            </Tooltip>
            <Tooltip content="Fetch TikTok" description="Import transcript from a TikTok video URL" side="bottom">
              <Button variant="ghost" size="sm" onClick={() => setTiktokModalOpen(true)} className="gap-1.5">
                <Link2 size={13} />
                Fetch TikTok
              </Button>
            </Tooltip>
            <Tooltip content="Read mode" description="Preview your script in a focused reading view" side="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await ensureSaved();
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
                className="gap-1.5"
              >
                <BookOpen size={13} />
                Read mode
              </Button>
            </Tooltip>
          </div>
        </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      {/* Left: Row1(Title, Character) + Row2(Chat with AI) */}
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
                onChange={(e) => onCharacterChange(e.target.value || null)}
                className="w-full h-10 rounded-xl border border-white/8 bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C3AED]/50"
              >
                <option value="">None</option>
                {characters.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-[#8B949E]">
                Used as context for AI.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Chat with AI */}
        <div className="mt-6 rounded-2xl border border-white/6 bg-[#0D1117] overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
          <div className="px-4 py-2 border-b border-white/6 shrink-0">
            <h3 className="text-xs font-medium text-[#8B949E] uppercase tracking-wider flex items-center gap-2">
              <Bot size={12} className="text-[#7C3AED]" />
              Chat with AI
            </h3>
          </div>
          <div className="flex-1 min-h-64 overflow-y-auto overflow-x-hidden p-3 space-y-2 min-w-0">
            {aiMessages.length === 0 && (
              <p className="text-xs text-[#8B949E]/70 text-center py-4">
                Ask AI to generate or modify your script. Current script is sent as context.
              </p>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2 text-xs min-w-0 w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-[#7C3AED]" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] min-w-0 rounded-xl px-3 py-2 overflow-hidden',
                    msg.role === 'user' ? 'bg-[#7C3AED]/10 text-white border border-[#7C3AED]/20' : 'bg-white/4 text-[#E6EDF3] border border-white/6'
                  )}
                >
                  {msg.role === 'ai' && msg.content ? (
                    <div className="text-[#E6EDF3] break-all [&_*]:text-xs [&_*]:break-all [&_*]:min-w-0 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:break-all [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:first:mt-0">
                      <ReactMarkdown>{messageContentForDisplay(msg.content)}</ReactMarkdown>
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
                      const userText = (lastUser?.content ?? '');
                      const userTextLower = userText.toLowerCase();
                      const isDeletion = /\b(delete|remove|keep only|drop)\b/.test(userTextLower);
                      const targetLineNumbers = parseLineNumbersFromUserMessage(userText);
                      const applyToTargetLines =
                        targetLineNumbers.length > 0 &&
                        targetLineNumbers.length === parsed.length &&
                        targetLineNumbers.every((n) => n >= 1 && n <= lines.length);

                      let merged: ScriptLine[];
                      if (applyToTargetLines) {
                        // User asked to edit specific line(s): apply parsed[j] to line targetLineNumbers[j]
                        merged = lines.map((existing, i) => {
                          const oneBased = i + 1;
                          const idxInTarget = targetLineNumbers.indexOf(oneBased);
                          if (idxInTarget === -1) return existing;
                          const replacement = parsed[idxInTarget];
                          return { ...replacement, flagColor: existing.flagColor ?? undefined };
                        });
                      } else if (parsed.length < lines.length && !isDeletion) {
                        // Partial edit by position: merge first N parsed blocks into first N lines
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
                      pushHistoryForAction();
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

        {analyzeError && (
          <div className="mt-4 shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
            <AlertTriangle size={14} />
            {analyzeError}
          </div>
        )}

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
            <div className="flex flex-col gap-2 shrink-0 mb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-[#8B949E]">
                  Edit lines with timestamps and script text. Use &quot;Add line&quot; for new blocks.
                </p>
                <div className="flex items-center gap-1">
                  <Tooltip content="Undo last edit">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleUndo}
                      disabled={!undoAvailable}
                      className="gap-1.5 h-7 text-xs text-[#8B949E] hover:text-white hover:bg-white/10 disabled:opacity-40"
                    >
                      <Undo2 size={12} />
                      Undo
                    </Button>
                  </Tooltip>
                  <Tooltip content="Redo">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRedo}
                      disabled={!redoAvailable}
                      className="gap-1.5 h-7 text-xs text-[#8B949E] hover:text-white hover:bg-white/10 disabled:opacity-40"
                    >
                      <Redo2 size={12} />
                      Redo
                    </Button>
                  </Tooltip>
                </div>
              </div>
              {analyzeResult && analyzeResult.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteAllSuggestions}
                  className="gap-1.5 w-fit text-[#8B949E] hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={12} />
                  Delete all suggestions
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ScriptLineEditor
                lines={lines}
                onChange={handleEditorChange}
                analyzeResult={analyzeResult}
                onImplementSuggestion={implementSuggestion}
                onDeleteSuggestion={deleteSuggestion}
                implementingItem={implementingItem}
                analyzing={analyzing}
              />
            </div>
          </div>
        </div>
      </aside>
      </div>

      {/* Read mode modal */}
      <ReadModeModal
        isOpen={readModeOpen}
        onClose={() => setReadModeOpen(false)}
        title={title || script.title || 'Script'}
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
