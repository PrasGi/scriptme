'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, Bot, X, Loader2, Tag, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getNextTimestamps } from '@/lib/parse-script';

export interface ScriptLine {
  startTime:  string;
  endTime:    string;
  text:       string;
  flagColor?: string;
}

export interface AnalyzeLine {
  lineIndex:  number;
  text:       string;
  type:       'actionable' | 'informational';
  suggestion: string;
  reason:     string;
}

interface ScriptLineEditorProps {
  lines:           ScriptLine[];
  onChange:        (lines: ScriptLine[]) => void;
  className?:      string;
  /** Per-line AI analysis. Displayed inline below each line. */
  analyzeResult?:  AnalyzeLine[] | null;
  /** Called when user clicks Implement on an actionable suggestion. Only shown for type "actionable". */
  onImplementSuggestion?: (item: AnalyzeLine) => void;
  /** The suggestion currently being implemented (shows loading on that button). */
  implementingItem?: AnalyzeLine | null;
  /** Called when user clicks delete suggestion for a line. */
  onDeleteSuggestion?:   (item: AnalyzeLine) => void;
  /** True while analysis is in progress (e.g. show loading for lines) */
  analyzing?:      boolean;
}

export function ScriptLineEditor({
  lines,
  onChange,
  className = '',
  analyzeResult = null,
  onImplementSuggestion,
  onDeleteSuggestion,
  implementingItem = null,
  analyzing = false,
}: ScriptLineEditorProps) {
  function getAnalysisForLine(i: number): AnalyzeLine | undefined {
    return analyzeResult?.find((a) => a.lineIndex === i);
  }
  function updateLine(i: number, updates: Partial<ScriptLine>) {
    onChange(
      lines.map((l, idx) => (idx === i ? { ...l, ...updates } : l))
    );
  }

  function removeLine(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }

  function addLine() {
    const last = lines[lines.length - 1];
    const { startTime, endTime } = last
      ? getNextTimestamps(last.endTime)
      : { startTime: '00:00:00.000', endTime: '00:00:02.000' };
    onChange([...lines, { startTime, endTime, text: '' }]);
  }

  const [openFlagIndex, setOpenFlagIndex] = useState<number | null>(null);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  function autoResizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResizeTextarea(el));
  }, [lines]);

  const PRESET_COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  ];

  return (
    <div className={className}>
      <div className="space-y-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl border bg-[#161B22] pt-2 px-4 pb-4 space-y-2 transition-colors',
              line.flagColor ? 'border-l-4 border-white/[0.08]' : 'border border-white/[0.08]'
            )}
            style={line.flagColor ? { borderLeftColor: line.flagColor, borderLeftWidth: 4 } : undefined}
          >
            <span className="text-[10px] text-[#8B949E]/60 tabular-nums block -mt-0.5">
              Line {i + 1}
            </span>
            {/* Script text — primary focus, auto-grows with content */}
            <textarea
              value={line.text}
              onChange={(e) => {
                updateLine(i, { text: e.target.value });
                autoResizeTextarea(e.target);
              }}
              ref={(el) => {
                if (el) {
                  textareaRefs.current.set(i, el);
                  autoResizeTextarea(el);
                } else {
                  textareaRefs.current.delete(i);
                }
              }}
              placeholder="Script text…"
              rows={1}
              className="w-full min-h-[44px] rounded-lg border border-white/[0.05] bg-white/[0.04] px-3 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E]/40 outline-none focus:border-[#06B6D4]/40 focus:ring-1 focus:ring-[#06B6D4]/15 focus:bg-white/[0.06] transition-[height,background-color,border-color] duration-150 ease-out overflow-y-auto resize-none"
            />

            {/* Times — compact, subtle, still editable */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  value={line.startTime}
                  onChange={(e) => updateLine(i, { startTime: e.target.value })}
                  placeholder="00:00:00.000"
                  className="w-[95px] min-w-[95px] h-7 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 text-[11px] text-[#8B949E] font-mono tabular-nums placeholder:text-[#8B949E]/40 outline-none focus:border-[#06B6D4]/40 focus:text-white focus:bg-white/[0.05] transition-colors"
                  title="Start time"
                />
                <span className="text-[#8B949E]/40 text-[10px]">→</span>
                <input
                  value={line.endTime}
                  onChange={(e) => updateLine(i, { endTime: e.target.value })}
                  placeholder="00:00:01.360"
                  className="w-[95px] min-w-[95px] h-7 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 text-[11px] text-[#8B949E] font-mono tabular-nums placeholder:text-[#8B949E]/40 outline-none focus:border-[#06B6D4]/40 focus:text-white focus:bg-white/[0.05] transition-colors"
                  title="End time"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Flag color palette — opens to the left of Tag trigger */}
                <div className="flex items-center overflow-hidden">
                  <div
                    className={cn(
                      'flex items-center gap-2 overflow-hidden transition-all duration-200 ease-out',
                      openFlagIndex === i ? 'max-w-[320px] opacity-100 mr-1' : 'max-w-0 opacity-0 mr-0'
                    )}
                  >
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateLine(i, { flagColor: line.flagColor === c ? undefined : c })}
                        className={cn(
                          'w-6 h-6 rounded-lg border-2 transition-all duration-150 shrink-0 hover:scale-110',
                          line.flagColor === c ? 'ring-2 ring-offset-2 ring-offset-[#161B22] ring-white/40' : 'border-transparent opacity-90 hover:opacity-100'
                        )}
                        style={{ backgroundColor: c, borderColor: line.flagColor === c ? c : 'transparent' }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={line.flagColor ?? '#808080'}
                      onChange={(e) => updateLine(i, { flagColor: e.target.value })}
                      className="w-6 h-6 rounded-lg border border-white/10 cursor-pointer bg-transparent p-0 shrink-0 opacity-90 hover:opacity-100 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                      title="Custom color"
                    />
                    {line.flagColor && (
                      <button
                        type="button"
                        onClick={() => { updateLine(i, { flagColor: undefined }); setOpenFlagIndex(null); }}
                        className="text-[10px] px-2 py-1 rounded-md text-[#8B949E] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                        title="Clear flag"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {/* Flag trigger — compact button */}
                  <button
                    type="button"
                    onClick={() => setOpenFlagIndex(openFlagIndex === i ? null : i)}
                    title="Flag line with color"
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-200 shrink-0',
                      line.flagColor
                        ? 'border-white/10 bg-white/5'
                        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
                    )}
                  >
                    {line.flagColor ? (
                      <div
                        className="w-4 h-4 rounded-md shrink-0"
                        style={{ backgroundColor: line.flagColor }}
                      />
                    ) : (
                      <Tag size={12} className="text-[#8B949E] shrink-0" />
                    )}
                    <ChevronLeft
                      size={10}
                      className={cn(
                        'text-[#8B949E] shrink-0 transition-transform duration-200',
                        openFlagIndex === i && 'rotate-180'
                      )}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="p-1 rounded text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove line"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Per-line AI analysis */}
            {analyzing && !getAnalysisForLine(i) && (
              <div className="flex items-center gap-2 mt-2 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <Bot size={12} className="text-[#06B6D4] animate-pulse shrink-0" />
                <span className="text-xs text-[#8B949E]">Analyzing…</span>
              </div>
            )}
            {!analyzing && getAnalysisForLine(i) && (() => {
              const analysis = getAnalysisForLine(i)!;
              return (
                <div className="mt-2 rounded-lg border border-white/[0.08] bg-[#0D1117]/80 overflow-hidden">
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bot size={12} className="text-[#06B6D4] shrink-0" />
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded',
                            analysis.type === 'actionable'
                              ? 'bg-[#06B6D4]/15 text-[#06B6D4]'
                              : 'bg-white/5 text-[#8B949E]'
                          )}
                        >
                          {analysis.type === 'actionable' ? 'Actionable' : 'Suggestion'}
                        </span>
                      </div>
                      {onDeleteSuggestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteSuggestion(analysis)}
                          className="p-1 rounded text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete suggestion"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#E6EDF3]">{analysis.suggestion}</p>
                    <p className="text-[11px] text-[#8B949E]">{analysis.reason}</p>
                    {analysis.type === 'actionable' && onImplementSuggestion && (
                      <Button
                        variant="cyan"
                        size="sm"
                        onClick={() => onImplementSuggestion(analysis)}
                        disabled={
                          !!implementingItem &&
                          implementingItem.lineIndex === analysis.lineIndex &&
                          implementingItem.suggestion === analysis.suggestion
                        }
                        className="mt-1.5 h-7 text-xs gap-1"
                      >
                        {implementingItem &&
                        implementingItem.lineIndex === analysis.lineIndex &&
                        implementingItem.suggestion === analysis.suggestion ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={11} />
                            Implement
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={addLine}
        className="mt-3 gap-2 w-full border border-dashed border-white/[0.12]"
      >
        <Plus size={14} />
        Add line
      </Button>
    </div>
  );
}
