'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

  // Find which line is active at currentTime
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
      idx = i; // past end of last line, keep last
    }
    setActiveIndex(idx);
  }, [currentTime, lines]);

  // Scroll active line into view when auto-scroll is on
  useEffect(() => {
    if (!autoScroll || activeIndex < 0) return;
    const el = lineRefs.current.get(activeIndex);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, autoScroll]);

  // Timer loop when playing
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

  function getLineDurationSec(i: number): number | null {
    const line = lines[i];
    if (!line) return null;
    const start = parseTimestampToSeconds(line.startTime);
    const end = parseTimestampToSeconds(line.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return Math.max(0, end - start);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        aria-hidden
      />

      {/* Content */}
      <div className="relative flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-white/8">
          <h2 className="text-lg font-semibold text-white truncate max-w-[60%]">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {hasTimestamps && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAutoScroll((v) => !v)}
                  className={cn(
                    'gap-1.5',
                    autoScroll && 'ring-1 ring-[#7C3AED]/50 bg-[#7C3AED]/10'
                  )}
                >
                  {autoScroll ? (
                    <ChevronDown size={14} className="rotate-0" />
                  ) : (
                    <ChevronUp size={14} className="rotate-180" />
                  )}
                  Auto scroll
                </Button>
                {isPlaying ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleStop}
                    className="gap-1.5"
                  >
                    <Square size={14} fill="currentColor" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleStart}
                    disabled={!hasTimestamps || lines.length === 0}
                    className="gap-1.5"
                  >
                    <Play size={14} fill="currentColor" />
                    Start read
                  </Button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close read mode"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Script content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-8"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {lines.length === 0 ? (
              <p className="text-[#8B949E] text-center py-12">No script lines to read.</p>
            ) : (
              lines.map((line, i) => {
                const isActiveLine = activeIndex === i;
                const progress = isPlaying && hasTimestamps && isActiveLine ? getLineProgress(i) : null;
                const showLoadingBar = isPlaying && isActiveLine && Boolean(line.startTime?.trim() && line.endTime?.trim());

                return (
                  <div
                    key={i}
                    ref={(el) => setLineRef(i, el)}
                    onClick={() => handleSeek(i)}
                    className={cn(
                      'rounded-xl px-5 py-4 text-lg leading-relaxed transition-all duration-300 cursor-pointer relative overflow-hidden',
                      line.flagColor ? 'border-l-[3px]' : '',
                      isActiveLine
                        ? 'bg-[#7C3AED]/15 text-white border border-[#7C3AED]/40 scale-[1.02] shadow-lg shadow-[#7C3AED]/10'
                        : 'bg-white/[0.04] text-[#8B949E] border border-transparent hover:bg-white/[0.06] hover:text-[#E6EDF3]'
                    )}
                    style={line.flagColor ? { borderLeftColor: line.flagColor + 'CC' } : undefined}
                  >
                    {line.text.trim() || <span className="italic text-[#8B949E]/60">Empty line</span>}
                    {/* Loading bar: only on active line when playing */}
                    {showLoadingBar && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden bg-white/10"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-b-xl bg-white/40"
                          style={{
                            width: progress != null ? `${Math.min(100, progress * 100)}%` : '0%',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Progress indicator when playing */}
        {isPlaying && hasTimestamps && (
          <div className="shrink-0 px-6 py-2 border-t border-white/8">
            <div className="max-w-2xl mx-auto flex items-center gap-2 text-xs text-[#8B949E]">
              <span className="tabular-nums">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}.{Math.floor((currentTime % 1) * 10)}
              </span>
              {activeIndex >= 0 && (
                <span className="truncate">
                  — Line {activeIndex + 1} of {lines.length}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
