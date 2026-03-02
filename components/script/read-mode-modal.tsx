'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Square, ChevronDown, ChevronUp, BookOpen, Clock } from 'lucide-react';
import { cn, stripHtml } from '@/lib/utils';
import { parseTimestampToSeconds } from '@/lib/parse-script';

export interface ScriptLine {
  startTime: string;
  endTime: string;
  text: string;
  flagColor?: string;
}

interface ReadModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  lines: ScriptLine[];
}

export function ReadModeModal({ isOpen, onClose, title, lines }: ReadModeModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

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
    if (!isPlaying || !isOpen) return;
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0a0a12]/95" aria-hidden />

      {/* Content */}
      <div className="relative flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 sm:px-10 pt-6 pb-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">
                  {title}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {lines.length} lines
                  {hasTimestamps && totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasTimestamps && (
                <>
                  <button
                    type="button"
                    onClick={() => setAutoScroll((v) => !v)}
                    className={cn(
                      'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all',
                      autoScroll
                        ? 'bg-[#7C3AED]/20 text-[#7C3AED] ring-1 ring-[#7C3AED]/30'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    )}
                  >
                    {autoScroll ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    Auto scroll
                  </button>
                  {isPlaying ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      <Square size={12} fill="currentColor" />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={!hasTimestamps || lines.length === 0}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-40 transition-all"
                    >
                      <Play size={12} fill="currentColor" />
                      Start read
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                aria-label="Close read mode"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Global progress bar */}
          {isPlaying && hasTimestamps && (
            <div className="max-w-3xl mx-auto mt-4">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#7C3AED] to-[#a78bfa] transition-all duration-100"
                  style={{ width: `${globalProgress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/30 font-mono tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>
                  {activeIndex >= 0 && `Line ${activeIndex + 1} of ${lines.length}`}
                </span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Script content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 sm:px-10 pb-12"
        >
          <div className="max-w-3xl mx-auto space-y-1">
            {lines.length === 0 ? (
              <p className="text-white/30 text-center py-20 text-lg">No script lines to read.</p>
            ) : (
              lines.map((line, i) => {
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
                      'group relative rounded-xl px-6 py-4 transition-all duration-300 cursor-pointer',
                      isActiveLine
                        ? 'bg-white/[0.07]'
                        : isPast
                          ? 'opacity-40'
                          : 'hover:bg-white/3'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Line number + timestamp */}
                      <div className="shrink-0 w-12 pt-1 text-right">
                        <span className={cn(
                          'text-[10px] font-mono tabular-nums block transition-colors',
                          isActiveLine ? 'text-[#7C3AED]' : 'text-white/20'
                        )}>
                          {i + 1}
                        </span>
                        {hasTimestamps && (
                          <span className={cn(
                            'text-[9px] font-mono tabular-nums block mt-0.5 transition-colors',
                            isActiveLine ? 'text-white/40' : 'text-white/10'
                          )}>
                            {line.startTime.split('.')[0]}
                          </span>
                        )}
                      </div>

                      {/* Flag indicator */}
                      {line.flagColor && (
                        <div
                          className="w-1 shrink-0 rounded-full self-stretch mt-1 mb-1"
                          style={{ backgroundColor: line.flagColor }}
                        />
                      )}

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        {lineText ? (
                          <span
                            className={cn(
                              'text-xl sm:text-2xl leading-relaxed transition-all duration-300 block',
                              isActiveLine
                                ? 'text-white font-medium'
                                : isPast
                                  ? 'text-white/50'
                                  : 'text-white/70'
                            )}
                            dangerouslySetInnerHTML={{ __html: line.text }}
                          />
                        ) : (
                          <span className="text-xl italic text-white/15">Empty line</span>
                        )}
                      </div>

                      {/* Active indicator dot */}
                      {isActiveLine && (
                        <div className="shrink-0 pt-3">
                          <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Per-line progress bar */}
                    {showProgressBar && (
                      <div className="mt-3 ml-16 h-0.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#7C3AED]/60"
                          style={{ width: progress != null ? `${Math.min(100, progress * 100)}%` : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
