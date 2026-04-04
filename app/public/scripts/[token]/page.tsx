'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { use } from 'react';
import {
  BookOpen, Play, Square, ChevronDown, ChevronUp,
  Loader2, FileText, Clock, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseTimestampToSeconds } from '@/lib/parse-script';

interface ScriptLine {
  startTime: string;
  endTime: string;
  text: string;
  flagColor?: string;
}

interface PublicScript {
  title: string;
  lines: ScriptLine[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PublicScriptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [script, setScript] = useState<PublicScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/public/scripts/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.message ?? 'Script not found');
        } else {
          setScript(json.data);
        }
      })
      .catch(() => setError('Failed to load script'))
      .finally(() => setLoading(false));
  }, [token]);

  const lines = script?.lines ?? [];

  const setLineRef = useCallback((i: number, el: HTMLDivElement | null) => {
    if (el) lineRefs.current.set(i, el);
    else lineRefs.current.delete(i);
  }, []);

  useEffect(() => {
    if (lines.length === 0) {
      setActiveIndex(-1);
      return;
    }
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const start = parseTimestampToSeconds(lines[i].startTime);
      const end = parseTimestampToSeconds(lines[i].endTime);
      if (currentTime >= start && currentTime < end) {
        idx = i;
        break;
      }
      if (currentTime < start) break;
      idx = i;
    }
    setActiveIndex(idx);
  }, [currentTime, lines]);

  useEffect(() => {
    if (!autoScroll || activeIndex < 0) return;
    const el = lineRefs.current.get(activeIndex);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, autoScroll]);

  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const hasTimestamps = lines.some(
    (l) => !Number.isNaN(parseTimestampToSeconds(l.startTime))
  );

  function getLineProgress(i: number): number | null {
    const line = lines[i];
    if (!line) return null;
    const start = parseTimestampToSeconds(line.startTime);
    const end = parseTimestampToSeconds(line.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    const duration = end - start;
    if (duration <= 0) return null;
    if (currentTime <= start) return 0;
    if (currentTime >= end) return 1;
    return (currentTime - start) / duration;
  }

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const totalDuration = lines.length > 0
    ? parseTimestampToSeconds(lines[lines.length - 1].endTime)
    : 0;

  const globalProgress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  function handleStart() {
    startTimeRef.current = performance.now();
    setCurrentTime(0);
    setIsPlaying(true);
  }

  function handleStop() {
    setIsPlaying(false);
  }

  function handleSeek(index: number) {
    if (index < 0 || index >= lines.length) return;
    const start = parseTimestampToSeconds(lines[index].startTime);
    if (isPlaying) {
      startTimeRef.current = performance.now() - start * 1000;
    }
    setCurrentTime(start);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
          <p className="text-white/40 text-sm">Loading script...</p>
        </div>
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Script Not Found</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            {error || 'This link may have expired or the script has been removed.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 mt-8 h-10 px-6 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors"
          >
            Go to ScriptMe
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-[#0a0a12]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center shrink-0 ring-1 ring-[#7C3AED]/20">
                <BookOpen size={18} className="text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-white truncate">
                  {script.title}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-white/30 flex items-center gap-1.5">
                    <FileText size={11} />
                    {lines.length} lines
                  </span>
                  {hasTimestamps && totalDuration > 0 && (
                    <span className="text-xs text-white/30 flex items-center gap-1.5">
                      <Clock size={11} />
                      {formatTime(totalDuration)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasTimestamps && (
                <>
                  <button
                    type="button"
                    onClick={() => setAutoScroll((v) => !v)}
                    className={cn(
                      'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all',
                      autoScroll
                        ? 'bg-[#7C3AED]/20 text-[#7C3AED] ring-1 ring-[#7C3AED]/30'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    )}
                  >
                    {autoScroll ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    <span className="hidden sm:inline">Auto scroll</span>
                  </button>
                  {isPlaying ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 ring-1 ring-red-500/20 transition-all"
                    >
                      <Square size={12} fill="currentColor" />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={lines.length === 0}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-40 transition-all"
                    >
                      <Play size={12} fill="currentColor" />
                      Start read
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isPlaying && hasTimestamps && (
            <div className="mt-4">
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a78bfa] transition-all duration-100"
                  style={{ width: `${globalProgress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/25 font-mono tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>
                  {activeIndex >= 0 && `Line ${activeIndex + 1} of ${lines.length}`}
                </span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Script content */}
      <main ref={containerRef} className="flex-1 overflow-y-auto px-6 sm:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          {lines.length === 0 ? (
            <p className="text-white/20 text-center py-20 text-lg">No script lines.</p>
          ) : (
            <div className="space-y-0.5">
              {lines.map((line, i) => {
                const isActiveLine = activeIndex === i;
                const isPast = activeIndex > i && isPlaying;
                const progress = isPlaying && hasTimestamps && isActiveLine ? getLineProgress(i) : null;
                const showProgressBar = isPlaying && isActiveLine && Boolean(line.startTime?.trim() && line.endTime?.trim());
                const lineText = line.text.trim();

                return (
                  <div
                    key={i}
                    ref={(el) => setLineRef(i, el)}
                    onClick={() => handleSeek(i)}
                    className={cn(
                      'group relative rounded-xl px-5 sm:px-6 py-4 transition-all duration-300 cursor-pointer',
                      isActiveLine
                        ? 'bg-white/[0.05]'
                        : isPast
                          ? 'opacity-35'
                          : 'hover:bg-white/[0.02]'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-12 pt-1 text-right">
                        <span className={cn(
                          'text-[10px] font-mono tabular-nums block transition-colors',
                          isActiveLine ? 'text-[#7C3AED]' : 'text-white/15'
                        )}>
                          {i + 1}
                        </span>
                        {hasTimestamps && (
                          <span className={cn(
                            'text-[9px] font-mono tabular-nums block mt-0.5 transition-colors',
                            isActiveLine ? 'text-white/35' : 'text-white/8'
                          )}>
                            {line.startTime.split('.')[0]}
                          </span>
                        )}
                      </div>

                      {line.flagColor && (
                        <div
                          className="w-1 shrink-0 rounded-full self-stretch mt-1 mb-1"
                          style={{ backgroundColor: line.flagColor }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        {lineText ? (
                          <span
                            className={cn(
                              'text-xl sm:text-2xl leading-relaxed transition-all duration-300 block',
                              isActiveLine
                                ? 'text-white font-medium'
                                : isPast
                                  ? 'text-white/40'
                                  : 'text-white/60'
                            )}
                            dangerouslySetInnerHTML={{ __html: line.text }}
                          />
                        ) : (
                          <span className="text-xl italic text-white/10">Empty line</span>
                        )}
                      </div>

                      {isActiveLine && (
                        <div className="shrink-0 pt-3">
                          <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
                        </div>
                      )}
                    </div>

                    {showProgressBar && (
                      <div className="mt-3 ml-16 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#7C3AED]/50"
                          style={{ width: progress != null ? `${Math.min(100, progress * 100)}%` : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-white/[0.04] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-[11px] text-white/20">
            Shared via{' '}
            <a href="/" className="text-[#7C3AED]/70 hover:text-[#7C3AED] transition-colors">
              ScriptMe
            </a>
          </p>
          {script.updatedAt && (
            <p className="text-[11px] text-white/15">
              Updated {new Date(script.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
