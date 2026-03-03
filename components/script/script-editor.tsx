'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, FilePlus, Loader2, Link2, Bot, User, Send, Save, Sparkles,
  Download, ChevronDown, Check, AlertTriangle, X, Trash2, BookOpen, UserCircle2, Undo2, Redo2, Pencil, HelpCircle,
  FileText, Braces, FileType, FileImage,
} from 'lucide-react';
import { cn, stripHtml } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { parseScriptLines, hasTimestampedScript } from '@/lib/parse-script';
import { ScriptLineEditor, type ScriptLine, type AnalyzeLine } from '@/components/script/script-line-editor';
import { ReadModeModal } from '@/components/script/read-mode-modal';
import { ScriptTutorial } from '@/components/script/script-tutorial';
import ReactMarkdown from 'react-markdown';

interface ChatContext {
  lineIndex: number;
  text: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  done?: boolean;
  contexts?: ChatContext[];
}

interface CharacterOption {
  _id: string;
  name: string;
  description: string;
}

interface Script {
  _id: string;
  title: string;
  status: 'draft' | 'analyzing' | 'ready';
  sourceType: string;
  sourceTiktokUrl?: string;
  characterId: string | null;
  lines: ScriptLine[];
  plainText: string;
  analyzeResult: AnalyzeLine[] | null;
  updatedAt: string;
}

const EXPORT_FORMATS = [
  { value: 'txt', label: 'Plain text', description: 'Timestamped .txt', icon: FileText },
  { value: 'json', label: 'JSON', description: 'Structured data', icon: Braces },
  { value: 'docx', label: 'Word document', description: 'Editable .docx', icon: FileType },
  { value: 'pdf', label: 'PDF', description: 'Print-ready with logo', icon: FileImage },
];

export interface ScriptEditorProps {
  projectId: string;
  /** When null, create mode (new script). When set, edit mode for that script id. */
  scriptId: string | null;
}

export function ScriptEditor({ projectId, scriptId }: ScriptEditorProps) {
  const isCreate = scriptId === null;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [script, setScript] = useState<Script | null>(null);
  const [title, setTitle] = useState(scriptId === null ? 'Untitled' : '');
  const [lines, setLines] = useState<ScriptLine[]>(
    isCreate ? [{ startTime: '00:00:00.000', endTime: '00:00:02.000', text: '' }] : []
  );
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');

  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [characterId, setCharacterId] = useState<string | null>(null);

  const [tiktokUrl, setTiktokUrl] = useState('');
  const [tiktokLang, setTiktokLang] = useState('');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokError, setTiktokError] = useState('');
  const [tiktokFetched, setTiktokFetched] = useState(false);
  const [pendingTikTokLines, setPendingTikTokLines] = useState<ScriptLine[] | null>(null);
  const [usedTiktokUrl, setUsedTiktokUrl] = useState('');

  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAppliedContent, setAiAppliedContent] = useState<string | null>(null);
  const [pendingLineEdits, setPendingLineEdits] = useState<{ edits: LineEdit[]; accepted: Record<number, boolean> } | null>(null);
  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const lastAiMsgRef = useRef<HTMLDivElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeLine[] | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [implementingItem, setImplementingItem] = useState<AnalyzeLine | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportDropdownRect, setExportDropdownRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [characterOpen, setCharacterOpen] = useState(false);
  const characterRef = useRef<HTMLDivElement>(null);
  const characterDropdownRef = useRef<HTMLDivElement>(null);
  const [characterDropdownRect, setCharacterDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [tiktokModalOpen, setTiktokModalOpen] = useState(false);
  const [readModeOpen, setReadModeOpen] = useState(false);

  const [chatContexts, setChatContexts] = useState<{ lineIndex: number; text: string }[]>([]);
  const [chatDragOver, setChatDragOver] = useState(false);

  const [createScriptLimit, setCreateScriptLimit] = useState<{
    allowed: boolean;
    used: number;
    limit: number | null;
  } | null>(null);

  const [titleEditing, setTitleEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const TITLE_MAX_LENGTH = 80;
  const TITLE_DISPLAY_MAX = 36;

  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialChecked = useRef(false);

  const lastSavedRef = useRef<string | null>(null);
  const actionHandledRef = useRef(false);

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
    if (isCreate) return;
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

  const handleEditorChange = useCallback(
    (newLines: ScriptLine[]) => {
      pushHistory();
      setLines(newLines);
    },
    [isCreate]
  );

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

  function pushHistoryForAction() {
    if (isCreate) return;
    lastPushTimeRef.current = 0;
    pushHistory();
  }

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCharacters(j.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isCreate) {
      fetch('/api/limits')
        .then((r) => r.json())
        .then((j) => {
          if (j.success && j.data?.save) setCreateScriptLimit(j.data.save);
        })
        .catch(() => {});
    }
  }, [isCreate]);

  useEffect(() => {
    fetch('/api/ai/session', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAiSessionId(json.data.sessionId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tutorialChecked.current) return;
    tutorialChecked.current = true;
    fetch('/api/users/tutorial')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.tutorialCompleted) {
          // already completed — skip
        } else {
          setShowTutorial(true);
        }
      })
      .catch(() => {});
  }, []);

  const prevAiLoadingRef = useRef(false);

  useEffect(() => {
    const wasLoading = prevAiLoadingRef.current;
    prevAiLoadingRef.current = aiLoading;

    // AI just finished responding — scroll AI message to top
    if (wasLoading && !aiLoading && lastAiMsgRef.current) {
      const t = requestAnimationFrame(() => {
        lastAiMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => cancelAnimationFrame(t);
    }

    // AI is streaming — keep bottom in view
    if (aiLoading && !pendingLineEdits) {
      const el = aiChatEndRef.current;
      if (!el) return;
      const t = requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
      return () => cancelAnimationFrame(t);
    }
  }, [aiMessages, aiLoading, pendingLineEdits]);

  useLayoutEffect(() => {
    if (exportOpen && exportRef.current) {
      const rect = exportRef.current.getBoundingClientRect();
      setExportDropdownRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setExportDropdownRect(null);
    }
  }, [exportOpen]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const inExportTrigger = exportRef.current?.contains(target);
      const inExportDropdown = exportDropdownRef.current?.contains(target);
      if (!inExportTrigger && !inExportDropdown) setExportOpen(false);
      const inCharacterTrigger = characterRef.current?.contains(target);
      const inCharacterDropdown = target.closest?.('[data-character-dropdown]');
      if (!inCharacterTrigger && !inCharacterDropdown) setCharacterOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function updateCharacterDropdownPosition() {
    const el = characterRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCharacterDropdownRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (characterOpen) {
      updateCharacterDropdownPosition();
      window.addEventListener('scroll', updateCharacterDropdownPosition, true);
      window.addEventListener('resize', updateCharacterDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateCharacterDropdownPosition, true);
        window.removeEventListener('resize', updateCharacterDropdownPosition);
      };
    } else {
      setCharacterDropdownRect(null);
    }
  }, [characterOpen]);

  useEffect(() => {
    if (titleEditing) titleInputRef.current?.focus();
  }, [titleEditing]);

  useEffect(() => {
    if (isCreate || !scriptId) return;
    fetch(`/api/projects/${projectId}/scripts/${scriptId}`)
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
  }, [projectId, scriptId, isCreate]);

  useEffect(() => {
    if (isCreate || !scriptId || loading || saving) return;
    const payload = JSON.stringify(lines);
    if (payload === lastSavedRef.current) return;
    if (!title.trim() || !lines.some((l) => stripHtml(l.text).trim())) return;

    const t = setTimeout(() => {
      const plainText = lines.map((l) => stripHtml(l.text)).join(' ');
      fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, plainText }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) lastSavedRef.current = JSON.stringify(lines);
        })
        .catch(() => {});
    }, 800);

    return () => clearTimeout(t);
  }, [lines, title, loading, saving, projectId, scriptId, isCreate]);

  useEffect(() => {
    if (isCreate || !script || script.status !== 'analyzing' || !analyzing || !scriptId) return;
    const pollInterval = 2000;
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      const r = await fetch(`/api/projects/${projectId}/scripts/${scriptId}`);
      const j = await r.json();
      if (!j.success) return;
      const status = j.data?.status;
      const result = j.data?.analyzeResult ?? null;
      if (status === 'ready' && result) {
        setAnalyzeResult(result);
        setScript((prev) => (prev ? { ...prev, status: 'ready', analyzeResult: result } : null));
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
  }, [script?.status, analyzing, projectId, scriptId, isCreate, script]);

  useEffect(() => {
    if (isCreate || loading || !script || !scriptId || actionHandledRef.current) return;
    const action = searchParams.get('action');
    if (!action) return;
    actionHandledRef.current = true;
    const format = searchParams.get('format') || 'txt';
    router.replace(`/projects/${projectId}/scripts/${scriptId}`);
    if (action === 'analyze') runAnalyze();
    else if (action === 'export')
      window.open(`/api/projects/${projectId}/scripts/${scriptId}/export?format=${format}`, '_blank');
  }, [loading, script, projectId, scriptId, searchParams, router, isCreate]);

  function serializeScriptContext(): string {
    const hasContent = lines.some((l) => stripHtml(l.text).trim());
    if (!hasContent) return '';
    if (isCreate) {
      return lines
        .map((l) => `${l.startTime} --> ${l.endTime}\n${stripHtml(l.text)}`)
        .join('\n\n');
    }
    const header = [
      '[CURRENT SCRIPT]',
      'Lines are numbered from 1. "Line N" means the N-th script line. Each line may have an optional flag (hex color).',
      '',
    ].join('\n');
    const body = lines
      .map((l, i) => {
        const lineNum = i + 1;
        const flagLabel = l.flagColor ? `(flag: ${l.flagColor})` : '(no flag)';
        return `Line ${lineNum} ${flagLabel}\n${l.startTime} --> ${l.endTime}\n${stripHtml(l.text)}`;
      })
      .join('\n\n');
    return header + body;
  }

  async function onCharacterChange(newId: string | null) {
    setCharacterId(newId);
    if (isCreate || !scriptId) return;
    try {
      await fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: newId }),
      });
      setScript((prev) => (prev ? { ...prev, characterId: newId } : null));
    } catch {
      /* ignore */
    }
  }

  function getCharacterContext(): string | undefined {
    if (!characterId) return undefined;
    const c = characters.find((x) => x._id === characterId);
    if (!c) return undefined;
    return `Character name: ${c.name}\nDescription: ${c.description || '(no description)'}`;
  }

  function messageContentForDisplay(aiText: string): string {
    return aiText
      .replace(/```[\s\S]*?```/g, (block) => (block.includes('flagUpdates') || block.includes('lineEdits') ? '' : block))
      // Greedy match so whole array is removed (non-greedy left partial JSON visible)
      .replace(/\{\s*"lineEdits"\s*:\s*\[[\s\S]*\]\s*\}/g, '')
      .replace(/\{\s*"flagUpdates"\s*:\s*\[[\s\S]*\]\s*\}/g, '')
      // Strip truncated/incomplete JSON at end (e.g. streamed response cut off)
      .replace(/\n?\s*\{\s*"lineEdits"\s*:\s*\[[\s\S]*$/g, '')
      .replace(/\n?\s*\{\s*"flagUpdates"\s*:\s*\[[\s\S]*$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function parseFlagUpdatesFromAiResponse(
    aiText: string
  ): { lineIndex: number; color: string | null }[] | null {
    const jsonBlock = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = jsonBlock ? jsonBlock[1].trim() : null;
    const candidates = raw ? [raw] : [];
    if (!raw) {
      const braceMatch = aiText.match(/\{\s*"flagUpdates"\s*:\s*\[[\s\S]*?\]\s*\}/);
      if (braceMatch) candidates.push(braceMatch[0]);
    }
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as { flagUpdates?: { lineIndex: number; color: string | null }[] };
        if (Array.isArray(parsed?.flagUpdates) && parsed.flagUpdates.length > 0) return parsed.flagUpdates;
      } catch { /* try next */ }
    }
    return null;
  }

  interface LineEdit {
    lineIndex: number;
    original: string;
    suggested: string;
  }

  function parseLineEditsFromAiResponse(aiText: string): LineEdit[] | null {
    const jsonBlock = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = jsonBlock ? jsonBlock[1].trim() : null;
    const candidates = raw ? [raw] : [];
    if (!raw) {
      const braceMatch = aiText.match(/\{\s*"lineEdits"\s*:\s*\[[\s\S]*?\]\s*\}/);
      if (braceMatch) candidates.push(braceMatch[0]);
    }
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as { lineEdits?: LineEdit[] };
        if (Array.isArray(parsed?.lineEdits) && parsed.lineEdits.length > 0) return parsed.lineEdits;
      } catch { /* try next */ }
    }
    return null;
  }

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

  function parseLineNumbersFromUserMessage(userMessage: string): number[] {
    const text = userMessage.trim();
    if (!text) return [];
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
      const nums = multi[1]
        .replace(/\band\s+/gi, ',')
        .split(/[\s,]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1);
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
        ...(scriptId ? { scriptId } : {}),
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

  async function ensureSaved(): Promise<boolean> {
    if (isCreate) return true;
    if (loading || saving) return true;
    const payload = JSON.stringify(lines);
    if (payload === lastSavedRef.current) return true;
    if (!title.trim() || !lines.some((l) => stripHtml(l.text).trim())) return true;
    return saveScriptEdit();
  }

  async function sendAiMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading || !aiSessionId) return;

    const rawInput = aiInput.trim();
    const savedContexts = chatContexts.length > 0 ? [...chatContexts] : undefined;
    const contextPrefix = savedContexts
      ? '[SELECTED TEXT]\n'
        + savedContexts.map((c) => `Line ${c.lineIndex + 1}: "${c.text}"`).join('\n')
        + '\n[/SELECTED TEXT]\n\n'
      : '';
    const userMsg = contextPrefix + rawInput;
    setAiInput('');
    setChatContexts([]);
    setAiAppliedContent(null);
    setPendingLineEdits(null);
    setAiMessages((prev) => [...prev, { role: 'user', content: rawInput, contexts: savedContexts }]);
    setAiLoading(true);
    setAiMessages((prev) => [...prev, { role: 'ai', content: '', done: false }]);

    try {
      if (!isCreate) await ensureSaved();
      await sendAiMessageWithSession(aiSessionId, userMsg, (aiText) => {
        if (isCreate) return;
        const flagUpdates = parseFlagUpdatesFromAiResponse(aiText);
        if (flagUpdates?.length) {
          pushHistoryForAction();
          setLines((prev) => applyFlagUpdatesToLines(prev, flagUpdates));
        }
        const lineEdits = parseLineEditsFromAiResponse(aiText);
        if (lineEdits?.length) {
          setPendingLineEdits({ edits: lineEdits, accepted: {} });
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
              if (isCreate) return;
              const flagUpdates = parseFlagUpdatesFromAiResponse(aiText);
              if (flagUpdates?.length) {
                pushHistoryForAction();
                setLines((prev) => applyFlagUpdatesToLines(prev, flagUpdates));
              }
              const lineEdits = parseLineEditsFromAiResponse(aiText);
              if (lineEdits?.length) {
                setPendingLineEdits({ edits: lineEdits, accepted: {} });
              }
            });
            return;
          }
        } catch {
          /* fall through */
        }
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
    return lines.some((l) => stripHtml(l.text).trim());
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
        const fetchedLines =
          parsed.length > 0 ? parsed : [{ startTime: '00:00:00.000', endTime: '00:00:02.000', text: '' }];

        if (!title.trim()) setTitle(json.data.description?.slice(0, 60) ?? '');

        if (hasExistingContent()) {
          setPendingTikTokLines(fetchedLines);
          setTiktokFetched(true);
        } else {
          setLines(fetchedLines);
          setUsedTiktokUrl(tiktokUrl.trim());
          if (!isCreate) setTiktokModalOpen(false);
        }
      }
    } catch {
      setTiktokError('Network error');
    } finally {
      setTiktokLoading(false);
    }
  }

  async function deleteSuggestion(item: AnalyzeLine) {
    if (isCreate || !scriptId) return;
    const next = (analyzeResult ?? []).filter(
      (a) => !(a.lineIndex === item.lineIndex && a.suggestion === item.suggestion)
    );
    setAnalyzeResult(next.length > 0 ? next : null);

    try {
      await fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeResult: next.length > 0 ? next : null }),
      });
    } catch {
      setAnalyzeResult(analyzeResult);
    }
  }

  async function deleteAllSuggestions() {
    if (isCreate || !scriptId) return;
    setAnalyzeResult(null);

    try {
      await fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeResult: null }),
      });
    } catch {
      setAnalyzeResult(analyzeResult);
    }
  }

  function acceptLineEdit(editIndex: number) {
    if (!pendingLineEdits) return;
    const edit = pendingLineEdits.edits[editIndex];
    if (!edit) return;
    pushHistoryForAction();
    setLines((prev) =>
      prev.map((l, i) => (i === edit.lineIndex ? { ...l, text: edit.suggested } : l))
    );
    setPendingLineEdits((prev) =>
      prev ? { ...prev, accepted: { ...prev.accepted, [editIndex]: true } } : null
    );
  }

  function rejectLineEdit(editIndex: number) {
    setPendingLineEdits((prev) =>
      prev ? { ...prev, accepted: { ...prev.accepted, [editIndex]: false } } : null
    );
  }

  function acceptAllLineEdits() {
    if (!pendingLineEdits) return;
    pushHistoryForAction();
    setLines((prev) => {
      const next = [...prev];
      for (const edit of pendingLineEdits.edits) {
        if (edit.lineIndex >= 0 && edit.lineIndex < next.length) {
          next[edit.lineIndex] = { ...next[edit.lineIndex], text: edit.suggested };
        }
      }
      return next;
    });
    const allAccepted: Record<number, boolean> = {};
    pendingLineEdits.edits.forEach((_, i) => { allAccepted[i] = true; });
    setPendingLineEdits((prev) => prev ? { ...prev, accepted: allAccepted } : null);
  }

  function dismissLineEdits() {
    setPendingLineEdits(null);
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

  type SaveOptions = { action?: string; format?: string };

  async function saveScriptNew(options?: SaveOptions): Promise<string | null> {
    if (!title.trim()) {
      setError('Please enter a title');
      return null;
    }
    const hasContent = lines.some((l) => stripHtml(l.text).trim());
    if (!hasContent) {
      setError('Add at least one script line');
      return null;
    }

    const plainText = lines.map((l) => stripHtml(l.text)).join(' ');
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

      const newId = json.data._id as string;
      const params = new URLSearchParams();
      if (options?.action) params.set('action', options.action);
      if (options?.format) params.set('format', options.format);
      const query = params.toString();
      router.push(`/projects/${projectId}/scripts/${newId}${query ? `?${query}` : ''}`);
      return newId;
    } catch {
      setError('Network error — please try again');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveScriptEdit(): Promise<boolean> {
    if (!scriptId) return false;
    if (!title.trim()) {
      setError('Please enter a title');
      return false;
    }
    const hasContent = lines.some((l) => stripHtml(l.text).trim());
    if (!hasContent) {
      setError('Add at least one script line');
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const plainText = lines.map((l) => stripHtml(l.text)).join(' ');
      const res = await fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), lines, plainText }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to save');
        return false;
      }
      setSaveOk(true);
      setScript((prev) => (prev ? { ...prev, ...json.data } : null));
      lastSavedRef.current = JSON.stringify(lines);
      setTimeout(() => setSaveOk(false), 2000);
      return true;
    } catch {
      setError('Network error — please try again');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function ensureSavedAndRedirect(action?: string, format?: string) {
    if (!canSave) {
      setError('Please add a title and at least one script line to use this feature');
      return;
    }
    await saveScriptNew({ action, format });
  }

  async function runAnalyze() {
    if (isCreate) return;
    const ok = await ensureSaved();
    if (!ok) return;
    if (!scriptId) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalyzeResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts/${scriptId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          characterId: characterId ?? undefined,
        }),
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
        const r = await fetch(`/api/projects/${projectId}/scripts/${scriptId}`);
        const j = await r.json();
        if (!j.success) return;

        const status = j.data?.status;
        const result = j.data?.analyzeResult ?? null;

        if (status === 'ready' && result) {
          setAnalyzeResult(result);
          setScript((prev) => (prev ? { ...prev, status: 'ready', analyzeResult: result } : null));
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
    if (isCreate || !scriptId || implementingItem) return;

    const scriptCtx = serializeScriptContext();
    if (!scriptCtx) return;

    setImplementingItem(item);

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts/${scriptId}/implement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineIndex: item.lineIndex,
          suggestion: item.suggestion,
          text: item.text,
          scriptContext: scriptCtx,
        }),
      });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        const lineList = buffer.split('\n');
        if (!done) buffer = lineList.pop() ?? '';
        for (const line of lineList) {
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
          setScript((prev) =>
            prev ? { ...prev, lines: merged, analyzeResult: next.length > 0 ? next : null } : null
          );

          await fetch(`/api/projects/${projectId}/scripts/${scriptId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lines: merged,
              plainText: merged.map((l) => stripHtml(l.text)).join(' '),
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
    if (isCreate || !scriptId) return;
    setExportOpen(false);
    window.open(`/api/projects/${projectId}/scripts/${scriptId}/export?format=${format}`, '_blank');
  }

  async function openReadMode() {
    if (!isCreate) await ensureSaved();
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
  }

  const canSave = title.trim() && lines.some((l) => stripHtml(l.text).trim());
  const atCreateScriptLimit = isCreate && createScriptLimit && !createScriptLimit.allowed;

  if (!isCreate && loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!isCreate && !loading && !script) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">Script not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push(`/projects/${projectId}`)}>
          Back to Project
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full min-h-0 overflow-x-hidden lg:h-[calc(100vh-7rem)] lg:min-h-0">
      {atCreateScriptLimit && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          Monthly script limit reached
          {createScriptLimit?.limit != null && ` (${createScriptLimit.used}/${createScriptLimit.limit})`}. Upgrade
          your plan or try again next month.
        </div>
      )}

      <header className="flex items-center justify-between gap-3 sm:gap-4 shrink-0 rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm shadow-sm shadow-slate-200/30 px-3 sm:px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-1">
          <Tooltip content="Back to project" description="Return to the project overview" side="bottom">
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
          </Tooltip>
          <div className="min-w-0 flex-1">
            {titleEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
                  onBlur={() => setTitleEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setTitleEditing(false);
                    if (e.key === 'Escape') setTitleEditing(false);
                  }}
                  placeholder="Script title"
                  className="flex-1 min-w-0 text-xl font-bold text-slate-800 bg-slate-50/90 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/50"
                  maxLength={TITLE_MAX_LENGTH}
                />
                <span className="text-xs text-slate-400 shrink-0">{title.length}/{TITLE_MAX_LENGTH}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  title={title || (isCreate ? 'New Script' : 'Edit Script')}
                  className="text-2xl font-bold text-slate-800 flex items-center gap-2 min-w-0"
                >
                  {isCreate ? (
                    <FilePlus size={22} className="text-[#7C3AED] shrink-0" />
                  ) : (
                    <Save size={22} className="text-[#7C3AED] shrink-0" />
                  )}
                  <span className="truncate max-w-[min(100%,theme(spacing.80))]" title={title.trim() || undefined}>
                    {title.trim()
                      ? (title.length > TITLE_DISPLAY_MAX ? `${title.slice(0, TITLE_DISPLAY_MAX)}…` : title)
                      : (isCreate ? 'New Script' : 'Edit Script')}
                  </span>
                  <Tooltip content="Edit title" side="bottom">
                    <button
                      type="button"
                      onClick={() => setTitleEditing(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors shrink-0"
                    >
                      <Pencil size={14} />
                    </button>
                  </Tooltip>
                </h1>
              </div>
            )}
            {!titleEditing && (
              <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                {isCreate ? 'Add a script to this project' : `${lines.length} lines`}
                {!isCreate && script && (
                  <Badge
                    variant={
                      script.status === 'ready' ? 'accent' : script.status === 'analyzing' ? 'orange' : 'default'
                    }
                    className="text-[10px]"
                  >
                    {script.status}
                  </Badge>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isCreate ? (
            <Button
              id="tour-save-btn"
              variant="secondary"
              size="sm"
              disabled={!canSave || saving || !!atCreateScriptLimit}
              onClick={() => saveScriptNew()}
              className="gap-1.5 h-9 rounded-xl border border-slate-200/70 bg-white text-slate-800 hover:bg-[#7C3AED]/5 hover:border-[#7C3AED]/20 shadow-sm shrink-0"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : (
            <Tooltip content="Save" description="Save your script changes" side="bottom">
              <Button
                id="tour-save-btn"
                variant="secondary"
                size="sm"
                onClick={() => saveScriptEdit()}
                disabled={saving || !canSave}
                className="gap-1.5 h-9 rounded-xl border border-slate-200/70 bg-white text-slate-800 hover:bg-[#7C3AED]/5 hover:border-[#7C3AED]/20 shadow-sm shrink-0"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saveOk ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Save size={14} />
                )}
                {saveOk ? 'Saved!' : 'Save'}
              </Button>
            </Tooltip>
          )}

          <div id="tour-export-btn" className="relative shrink-0" ref={exportRef}>
            <Tooltip content="Export" description="Download as TXT, JSON, Word, or PDF" side="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                className="gap-1.5 h-9 w-9 sm:w-auto sm:min-w-0 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 px-2 sm:px-3"
                disabled={isCreate ? saving || !!atCreateScriptLimit : false}
              >
                <Download size={13} className="shrink-0" />
                <ChevronDown size={12} className="hidden sm:block shrink-0" />
              </Button>
            </Tooltip>
          </div>
          {exportOpen && exportDropdownRect && typeof document !== 'undefined' && createPortal(
            <div
              ref={exportDropdownRef}
              className="fixed min-w-[240px] w-64 rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-300/40 z-[9999] overflow-hidden py-2"
              style={{
                top: exportDropdownRect.top + exportDropdownRect.height + 8,
                left: Math.max(8, exportDropdownRect.left + exportDropdownRect.width - 256),
              }}
            >
              {EXPORT_FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      if (isCreate) ensureSavedAndRedirect('export', f.value);
                      else exportScript(f.value);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl mx-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50/90 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100/80">
                      <Icon size={18} className="text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-slate-500 truncate">{f.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>,
            document.body
          )}

          <div className="h-6 w-px bg-slate-200/80 shrink-0 mx-0.5" aria-hidden />

          <div id="tour-character-select" className="relative" ref={characterRef}>
            {!characterOpen ? (
              <Tooltip content="Character" description="Used as context for AI" side="bottom">
                <button
                  type="button"
                  onClick={() => setCharacterOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 h-9 pl-2.5 pr-7 sm:pl-3 sm:pr-8 rounded-xl border border-slate-200/70 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm text-sm transition-all min-w-0 max-w-24 sm:max-w-[128px] shrink-0"
                >
                  <UserCircle2 size={14} className="text-[#7C3AED] shrink-0" />
                  <span className="min-w-0 truncate">
                    {characterId ? characters.find((c) => c._id === characterId)?.name ?? 'None' : 'None'}
                  </span>
                  <ChevronDown size={12} className="absolute right-2 sm:right-2.5 text-slate-400 pointer-events-none shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setCharacterOpen(false)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 h-9 pl-2.5 pr-7 sm:pl-3 sm:pr-8 rounded-xl border text-sm transition-all min-w-0 max-w-24 sm:max-w-[128px] shrink-0',
                  'border-[#7C3AED]/40 bg-[#7C3AED]/5 text-slate-800 shadow-sm'
                )}
              >
                <UserCircle2 size={14} className="text-[#7C3AED] shrink-0" />
                <span className="min-w-0 truncate">
                  {characterId ? characters.find((c) => c._id === characterId)?.name ?? 'None' : 'None'}
                </span>
                <ChevronDown size={12} className="absolute right-2 sm:right-2.5 text-slate-400 pointer-events-none rotate-180" />
              </button>
            )}
            {characterOpen &&
              characterDropdownRect &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={characterDropdownRef}
                  data-character-dropdown
                  className="fixed w-56 rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-400/25 py-1.5 max-h-[min(280px,50vh)] overflow-y-auto"
                  style={{
                    top: characterDropdownRect.top,
                    left: characterDropdownRect.left,
                    zIndex: 9999,
                  }}
                  role="listbox"
                  aria-label="Select character"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCharacterChange(null);
                      requestAnimationFrame(() => setCharacterOpen(false));
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                      !characterId ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    <UserCircle2 size={14} className="shrink-0 opacity-70" />
                    None
                  </button>
                  {characters.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCharacterChange(c._id);
                        requestAnimationFrame(() => setCharacterOpen(false));
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                        characterId === c._id ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      )}
                    >
                      <UserCircle2 size={14} className="shrink-0 opacity-70" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>,
                document.body
              )}
          </div>

          <div className="h-6 w-px bg-slate-200/80 shrink-0 mx-0.5" aria-hidden />

          {isCreate ? (
            <Button
              id="tour-analyze-btn"
              variant="ghost"
              size="sm"
              onClick={() => ensureSavedAndRedirect('analyze')}
              disabled={!canSave || saving || lines.length === 0 || !!atCreateScriptLimit}
              className="gap-1.5 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 shrink-0 px-2 sm:px-3"
            >
              <Sparkles size={13} className="shrink-0" />
              <span className="hidden sm:inline">Analyze</span>
            </Button>
          ) : (
            <Tooltip content="Analyze" description="Get AI feedback and suggestions for each line" side="bottom">
              <Button
                id="tour-analyze-btn"
                variant="ghost"
                size="sm"
                onClick={runAnalyze}
                disabled={analyzing || lines.length === 0}
                className="gap-1.5 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 shrink-0 px-2 sm:px-3"
              >
                {analyzing ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Sparkles size={13} className="shrink-0" />}
                <span className="hidden sm:inline">Analyze</span>
              </Button>
            </Tooltip>
          )}

          <Tooltip content="Fetch TikTok" description="Import transcript from a TikTok video URL" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTiktokModalOpen(true)}
              className="gap-1.5 h-9 w-9 sm:w-auto sm:min-w-0 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 shrink-0 px-2 sm:px-3"
            >
              <Link2 size={13} className="shrink-0" />
              <span className="hidden sm:inline">Fetch TikTok</span>
            </Button>
          </Tooltip>

          <Tooltip content="Read mode" description="Preview your script in a focused reading view" side="bottom">
            <Button
              id="tour-readmode-btn"
              variant="ghost"
              size="sm"
              onClick={openReadMode}
              disabled={lines.length === 0}
              className="gap-1.5 h-9 w-9 sm:w-auto sm:min-w-0 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 shrink-0 px-2 sm:px-3"
            >
              <BookOpen size={13} className="shrink-0" />
              <span className="hidden sm:inline">Read mode</span>
            </Button>
          </Tooltip>

          <div className="h-6 w-px bg-slate-200/80 shrink-0 mx-0.5" aria-hidden />

          <Tooltip content="Tutorial" description="Replay the guided tour of the editor" side="bottom">
            <button
              id="tour-help-btn"
              type="button"
              onClick={() => setShowTutorial(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all shrink-0"
            >
              <HelpCircle size={16} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:max-w-[45%] order-last lg:order-first">
          <div
            id="tour-ai-chat"
            className={cn(
              'mt-6 rounded-2xl border bg-white/70 backdrop-blur-md overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm shadow-slate-200/20 transition-colors',
              chatDragOver
                ? 'border-[#7C3AED]/50 bg-[#7C3AED]/5'
                : 'border-slate-200/50'
            )}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/x-script-line')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setChatDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setChatDragOver(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setChatDragOver(false);
              const data = e.dataTransfer.getData('application/x-script-line');
              if (data) {
                try {
                  const parsed = JSON.parse(data) as { lineIndex: number; text: string };
                  setChatContexts((prev) => [...prev, parsed]);
                } catch { /* ignore */ }
              }
            }}
          >
            <div className="px-4 py-2 border-b border-slate-200/50 shrink-0 bg-white/80">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Bot size={12} className="text-[#7C3AED]" />
                Chat with AI
              </h3>
            </div>
            {chatDragOver && (
              <div className="px-4 py-2 bg-[#7C3AED]/10 border-b border-[#7C3AED]/20 shrink-0">
                <p className="text-xs text-[#7C3AED] font-medium text-center">
                  Drop line here to add as context
                </p>
              </div>
            )}
            <div className="flex-1 min-h-64 overflow-y-auto p-3 space-y-2 min-w-0">
              {aiMessages.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  Ask AI to generate or modify your script. Current script is sent as context.
                </p>
              )}
              {aiMessages.map((msg, i) => {
                const isLastAi = msg.role === 'ai' && i === aiMessages.length - 1;
                return (
                <div
                  key={i}
                  ref={isLastAi ? lastAiMsgRef : undefined}
                  className={cn(
                    'flex gap-2 text-xs min-w-0 w-full',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-[#7C3AED]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] min-w-0 overflow-hidden',
                      msg.role === 'user'
                        ? 'flex flex-col gap-1.5 items-end'
                        : ''
                    )}
                  >
                    {/* IDE-style context references for user messages */}
                    {msg.role === 'user' && msg.contexts && msg.contexts.length > 0 && (
                      <div className="w-full space-y-1">
                        {msg.contexts.map((ctx, ci) => (
                          <div
                            key={ci}
                            className="rounded-lg border border-slate-200/60 bg-slate-50/80 overflow-hidden"
                          >
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 border-b border-slate-200/40">
                              <span className="text-[10px] font-medium text-slate-500">Line {ctx.lineIndex + 1}</span>
                            </div>
                            <div className="px-2.5 py-1.5 font-mono text-[11px] text-slate-700 leading-relaxed">
                              {ctx.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2',
                        msg.role === 'user'
                          ? 'bg-[#7C3AED]/10 text-slate-800 border border-[#7C3AED]/20'
                          : 'bg-slate-50/80 text-slate-700 border border-slate-200/50'
                      )}
                    >
                      {msg.role === 'ai' && msg.content ? (
                        <div className="chat-ai-prose">
                          <ReactMarkdown>
                            {isCreate ? msg.content : messageContentForDisplay(msg.content)}
                          </ReactMarkdown>
                        </div>
                      ) : msg.role === 'ai' && !msg.done ? (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Loader2 size={10} className="animate-spin" /> Thinking…
                        </span>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center shrink-0">
                      <User size={12} className="text-slate-500" />
                    </div>
                  )}
                </div>
                );
              })}
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
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
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
                      className="text-xs h-7 !text-slate-800 !bg-slate-100/90 hover:!bg-slate-200/80 !border-slate-200/60"
                      onClick={() => {
                        const lastUser = [...aiMessages].reverse().find((m) => m.role === 'user');
                        const userText = (lastUser?.content ?? '').toLowerCase();
                        const isDeletion = /\b(delete|remove|keep only|drop)\b/.test(userText);
                        let merged: ScriptLine[];
                        if (isCreate) {
                          if (parsed.length < lines.length && !isDeletion) {
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
                        } else {
                          const userTextFull = lastUser?.content ?? '';
                          const targetLineNumbers = parseLineNumbersFromUserMessage(userTextFull);
                          const applyToTargetLines =
                            targetLineNumbers.length > 0 &&
                            targetLineNumbers.length === parsed.length &&
                            targetLineNumbers.every((n) => n >= 1 && n <= lines.length);

                          if (applyToTargetLines) {
                            merged = lines.map((existing, i) => {
                              const oneBased = i + 1;
                              const idxInTarget = targetLineNumbers.indexOf(oneBased);
                              if (idxInTarget === -1) return existing;
                              const replacement = parsed[idxInTarget];
                              return { ...replacement, flagColor: existing.flagColor ?? undefined };
                            });
                          } else if (parsed.length < lines.length && !isDeletion) {
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
              {/* Per-line edit accept/reject UI */}
              {pendingLineEdits && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Suggested edits</span>
                  </div>
                  {pendingLineEdits.edits.map((edit, ei) => {
                    const status = pendingLineEdits.accepted[ei];
                    const isAccepted = status === true;
                    const isRejected = status === false;
                    const isPending = status === undefined;

                    return (
                      <div
                        key={ei}
                        className={cn(
                          'rounded-lg border overflow-hidden transition-all',
                          isAccepted
                            ? 'border-emerald-200/60 bg-emerald-50/50'
                            : isRejected
                              ? 'border-slate-200/40 bg-slate-50/30 opacity-50'
                              : 'border-slate-200/60 bg-white'
                        )}
                      >
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/80 border-b border-slate-200/40">
                          <span className="text-[10px] font-medium text-slate-500">
                            Line {edit.lineIndex + 1}
                          </span>
                          {isAccepted && (
                            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                              <Check size={10} /> Accepted
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <X size={10} /> Rejected
                            </span>
                          )}
                        </div>
                        <div className="px-2.5 py-2 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-medium text-red-400 uppercase mt-0.5 shrink-0 w-7">old</span>
                            <p className="text-[11px] text-slate-500 line-through leading-relaxed">{edit.original}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-medium text-emerald-500 uppercase mt-0.5 shrink-0 w-7">new</span>
                            <p className="text-[11px] text-slate-800 leading-relaxed font-medium">{edit.suggested}</p>
                          </div>
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-1 px-2.5 py-1.5 border-t border-slate-200/40 bg-slate-50/40">
                            <button
                              type="button"
                              onClick={() => acceptLineEdit(ei)}
                              className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[10px] font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            >
                              <Check size={10} />
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectLineEdit(ei)}
                              className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[10px] font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <X size={10} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>
            {pendingLineEdits && Object.keys(pendingLineEdits.accepted).length < pendingLineEdits.edits.length && (
              <div className="sticky bottom-0 shrink-0 flex items-center justify-center gap-2 px-3 py-2 border-t border-slate-200/50 bg-white/95 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={acceptAllLineEdits}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors"
                >
                  <Check size={11} />
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={dismissLineEdits}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={11} />
                  Dismiss
                </button>
              </div>
            )}
            <form onSubmit={sendAiMessage} className="border-t border-slate-200/50 shrink-0">
              {chatContexts.length > 0 && (
                <div className="px-2 pt-2 pb-1 flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {chatContexts.map((ctx, ci) => (
                    <div key={ci} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#7C3AED]/8 border border-[#7C3AED]/20 text-[11px] shrink-0">
                      <Bot size={11} className="text-[#7C3AED] shrink-0" />
                      <span className="text-[#7C3AED] font-medium shrink-0">Line {ctx.lineIndex + 1}:</span>
                      <span className="text-slate-600 truncate min-w-0">&ldquo;{ctx.text}&rdquo;</span>
                      <button
                        type="button"
                        onClick={() => setChatContexts((prev) => prev.filter((_, j) => j !== ci))}
                        className="ml-auto p-0.5 text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 p-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={chatContexts.length > 0 ? 'Ask about this selection…' : (aiSessionId ? 'Ask AI…' : 'Initializing…')}
                  disabled={!aiSessionId || aiLoading}
                  className="flex-1 h-8 px-3 rounded-lg border border-slate-200/60 bg-white/80 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/50 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={!aiSessionId || aiLoading || !aiInput.trim()}
                  className="h-8 px-3 shrink-0"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </Button>
              </div>
            </form>
          </div>

          {!isCreate && analyzeError && (
            <div className="mt-4 shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
              <AlertTriangle size={14} />
              {analyzeError}
            </div>
          )}

          {error && (
            <div className="mt-4 shrink-0">
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            </div>
          )}
        </div>

        <aside id="tour-script-lines" className="w-full lg:min-w-[55%] lg:flex-1 shrink-0 order-first lg:order-last flex flex-col min-h-0">
          <div className="mt-4 flex-1 min-h-0 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 mb-1 border-b border-slate-200/40 shrink-0">
              <p className="text-xs text-slate-400">
                {isCreate ? 'Add lines and script text.' : `${lines.length} lines`}
              </p>
              <div className="flex items-center gap-1">
                {!isCreate && analyzeResult && analyzeResult.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteAllSuggestions}
                    className="inline-flex items-center gap-1.5 h-7 px-2 text-xs text-slate-400 hover:text-red-500 transition-colors rounded-lg"
                  >
                    <Trash2 size={11} />
                    Clear suggestions
                  </button>
                )}
                {!isCreate && (
                  <>
                    <Tooltip content="Undo">
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!undoAvailable}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors rounded-lg"
                      >
                        <Undo2 size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Redo">
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!redoAvailable}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors rounded-lg"
                      >
                        <Redo2 size={14} />
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
            {/* Script lines */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {isCreate ? (
                <ScriptLineEditor lines={lines} onChange={setLines} onAddToChat={(ctx) => setChatContexts((prev) => [...prev, ctx])} />
              ) : (
                <ScriptLineEditor
                  lines={lines}
                  onChange={handleEditorChange}
                  analyzeResult={analyzeResult}
                  onImplementSuggestion={implementSuggestion}
                  onDeleteSuggestion={deleteSuggestion}
                  implementingItem={implementingItem}
                  analyzing={analyzing}
                  onAddToChat={(ctx) => setChatContexts((prev) => [...prev, ctx])}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      <ReadModeModal
        isOpen={readModeOpen}
        onClose={() => setReadModeOpen(false)}
        title={title || (script?.title ?? 'Script')}
        lines={lines}
      />

      <ScriptTutorial
        shouldRun={showTutorial}
        onComplete={() => setShowTutorial(false)}
      />

      {tiktokModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-300/30">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Link2 size={15} className="text-[#7C3AED]" />
                Fetch from TikTok URL
              </h2>
              <button
                onClick={() => {
                  setTiktokModalOpen(false);
                  setTiktokError('');
                }}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={fetchTikTok} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  TikTok URL
                </label>
                <Input
                  light
                  placeholder="https://www.tiktok.com/@user/video/..."
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Language
                </label>
                <select
                  value={tiktokLang}
                  onChange={(e) => setTiktokLang(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#7C3AED]/50"
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
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {tiktokError}
                </p>
              )}
              {tiktokFetched && pendingTikTokLines ? (
                <div className="space-y-2 pt-2 border-t border-slate-200/50">
                  <span className="text-xs text-slate-500 block">
                    Transcript fetched. Choose how to use it:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={applyReplace}
                      className="w-full justify-center !text-slate-800 !bg-slate-100/90 hover:!bg-slate-200/80 !border-slate-200/60"
                    >
                      Replace script
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={applyAddBottom}
                      className="w-full justify-center !text-slate-800 !bg-slate-100/90 hover:!bg-slate-200/80 !border-slate-200/60"
                    >
                      Add on bottom
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={applyAddTop}
                      className="w-full justify-center !text-slate-800 !bg-slate-100/90 hover:!bg-slate-200/80 !border-slate-200/60"
                    >
                      Add on top
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={tiktokLoading || !tiktokUrl.trim()}
                    className="gap-2"
                  >
                    {tiktokLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    {tiktokLoading ? 'Fetching…' : 'Fetch'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setTiktokModalOpen(false)}
                    disabled={tiktokLoading}
                    className="!text-slate-700 hover:!bg-slate-100/80 hover:!text-slate-900"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
            {usedTiktokUrl && !tiktokFetched && (
              <div className="px-5 pb-5">
                <p className="text-xs text-slate-500 truncate" title={usedTiktokUrl}>
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
