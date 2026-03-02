'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, Bot, X, Loader2, Tag, MessageSquarePlus } from 'lucide-react';
import { cn, ensureHtml, stripHtml } from '@/lib/utils';
import { getNextTimestamps } from '@/lib/parse-script';
import { TiptapLine } from './tiptap-line';

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
  analyzeResult?:  AnalyzeLine[] | null;
  onImplementSuggestion?: (item: AnalyzeLine) => void;
  implementingItem?: AnalyzeLine | null;
  onDeleteSuggestion?:   (item: AnalyzeLine) => void;
  analyzing?:      boolean;
  onAddToChat?:    (context: { lineIndex: number; text: string }) => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#7C3AED', '#3B82F6', '#8B5CF6', '#EC4899',
];

export function ScriptLineEditor({
  lines,
  onChange,
  className = '',
  analyzeResult = null,
  onImplementSuggestion,
  onDeleteSuggestion,
  implementingItem = null,
  analyzing = false,
  onAddToChat,
}: ScriptLineEditorProps) {
  function getAnalysisForLine(i: number): AnalyzeLine | undefined {
    return analyzeResult?.find((a) => a.lineIndex === i);
  }

  function updateLine(i: number, updates: Partial<ScriptLine>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...updates } : l)));
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addedLineIndex, setAddedLineIndex] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, i: number) {
    const plainText = stripHtml(lines[i].text);
    e.dataTransfer.setData(
      'application/x-script-line',
      JSON.stringify({ lineIndex: i, text: plainText })
    );
    e.dataTransfer.setData('text/plain', plainText);
    e.dataTransfer.effectAllowed = 'copy';
    setDragIndex(i);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className={className}>
      <div className="divide-y divide-slate-100">
        {lines.map((line, i) => {
          const analysis = getAnalysisForLine(i);
          const isImplementing =
            !!implementingItem &&
            implementingItem.lineIndex === i &&
            implementingItem.suggestion === analysis?.suggestion;
          const isDragging = dragIndex === i;

          return (
            <div
              key={i}
              {...(i === 0 ? { id: 'tour-first-line' } : {})}
              className={cn(
                'group/line relative transition-colors hover:bg-slate-50/50',
                isDragging && 'opacity-40'
              )}
            >
              {/* Flag accent bar */}
              {line.flagColor && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                  style={{ backgroundColor: line.flagColor }}
                />
              )}

              <div className={cn('py-3 pr-3', line.flagColor ? 'pl-4' : 'pl-1')}>
                {/* Main content row */}
                <div className="flex items-start gap-1">
                  {/* Add to AI chat */}
                  <button
                    type="button"
                    {...(i === 0 ? { id: 'tour-add-to-chat' } : {})}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (onAddToChat) {
                        const plainText = stripHtml(lines[i].text);
                        if (plainText.trim()) {
                          onAddToChat({ lineIndex: i, text: plainText.trim() });
                          setAddedLineIndex(i);
                          setTimeout(() => setAddedLineIndex(null), 800);
                        }
                      }
                    }}
                    className={cn(
                      'pt-2 shrink-0 transition-all cursor-pointer',
                      addedLineIndex === i
                        ? 'opacity-100 scale-125'
                        : 'opacity-0 group-hover/line:opacity-100'
                    )}
                    title="Add line to AI chat"
                  >
                    <MessageSquarePlus
                      size={14}
                      className={cn(
                        'transition-colors',
                        addedLineIndex === i
                          ? 'text-[#7C3AED]'
                          : 'text-slate-300 hover:text-[#7C3AED]'
                      )}
                    />
                  </button>

                  {/* Gutter: line number */}
                  <span className="text-[10px] text-slate-300 tabular-nums pt-2 w-5 text-right shrink-0 select-none group-hover/line:text-slate-400 transition-colors">
                    {i + 1}
                  </span>

                  {/* Rich text editor */}
                  <TiptapLine
                    content={ensureHtml(line.text)}
                    onChange={(html) => updateLine(i, { text: html })}
                    lineIndex={i}
                    onAddToChat={onAddToChat}
                  />

                  {/* Actions — show on line hover */}
                  <div
                    {...(i === 0 ? { id: 'tour-line-actions' } : {})}
                    className="flex items-center gap-0.5 pt-1.5 shrink-0 opacity-0 group-hover/line:opacity-100 transition-opacity"
                  >
                    {/* Flag trigger */}
                    <button
                      type="button"
                      onClick={() => setOpenFlagIndex(openFlagIndex === i ? null : i)}
                      title="Flag line"
                      className={cn(
                        'p-1.5 rounded-lg transition-all',
                        line.flagColor
                          ? 'hover:bg-slate-100/80'
                          : 'text-slate-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10'
                      )}
                    >
                      {line.flagColor ? (
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: line.flagColor }} />
                      ) : (
                        <Tag size={14} />
                      )}
                    </button>
                    {/* Delete line */}
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                      title="Delete line"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Meta row: timestamps + flag picker */}
                <div className="flex items-center gap-2 mt-1 ml-12">
                  {/* Timestamps */}
                  <div className="flex items-center gap-1">
                    <input
                      value={line.startTime}
                      onChange={(e) => updateLine(i, { startTime: e.target.value })}
                      placeholder="00:00:00.000"
                      className="w-20 h-5 bg-transparent border-0 border-b border-transparent focus:border-slate-200 px-0 text-[10px] text-slate-400 font-mono tabular-nums placeholder:text-slate-300 outline-none transition-colors"
                      title="Start time"
                    />
                    <span className="text-slate-300 text-[9px]">-</span>
                    <input
                      value={line.endTime}
                      onChange={(e) => updateLine(i, { endTime: e.target.value })}
                      placeholder="00:00:01.360"
                      className="w-20 h-5 bg-transparent border-0 border-b border-transparent focus:border-slate-200 px-0 text-[10px] text-slate-400 font-mono tabular-nums placeholder:text-slate-300 outline-none transition-colors"
                      title="End time"
                    />
                  </div>

                  {/* Flag color palette — expand left */}
                  {openFlagIndex === i && (
                    <div className="flex items-center gap-1.5 ml-2 animate-in fade-in slide-in-from-right-2 duration-150">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateLine(i, { flagColor: line.flagColor === c ? undefined : c })}
                          className={cn(
                            'w-5 h-5 rounded-md transition-all duration-150 shrink-0 hover:scale-110 shadow-sm',
                            line.flagColor === c ? 'ring-2 ring-offset-1 ring-offset-white ring-[#7C3AED]/60 scale-110' : 'hover:shadow-md'
                          )}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={line.flagColor ?? '#808080'}
                        onChange={(e) => updateLine(i, { flagColor: e.target.value })}
                        className="w-5 h-5 rounded-md cursor-pointer bg-transparent p-0 shrink-0 shadow-sm hover:shadow-md [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0"
                        title="Custom color"
                      />
                      {line.flagColor && (
                        <button
                          type="button"
                          onClick={() => { updateLine(i, { flagColor: undefined }); setOpenFlagIndex(null); }}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                          title="Clear flag"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* AI analysis */}
                {analyzing && !analysis && (
                  <div className="flex items-center gap-2 mt-2 ml-12 py-1.5">
                    <Bot size={12} className="text-[#7C3AED] animate-pulse shrink-0" />
                    <span className="text-[11px] text-slate-400">Analyzing...</span>
                  </div>
                )}
                {!analyzing && analysis && (
                  <div className="group/suggestion mt-2 ml-12 rounded-lg border-l-2 border-[#7C3AED]/30 bg-[#7C3AED]/3 px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bot size={11} className="text-[#7C3AED] shrink-0" />
                        <span
                          className={cn(
                            'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                            analysis.type === 'actionable'
                              ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {analysis.type === 'actionable' ? 'Fix' : 'Tip'}
                        </span>
                      </div>
                      {onDeleteSuggestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteSuggestion(analysis)}
                          className="p-1 rounded text-slate-300 opacity-0 group-hover/suggestion:opacity-100 hover:text-red-400 transition-all"
                          title="Dismiss"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{analysis.suggestion}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.reason}</p>
                    {analysis.type === 'actionable' && onImplementSuggestion && (
                      <button
                        type="button"
                        onClick={() => onImplementSuggestion(analysis)}
                        disabled={isImplementing}
                        className={cn(
                          'mt-1 inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-[11px] font-medium transition-colors',
                          'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isImplementing ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={10} />
                            Implement
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add line */}
      <button
        type="button"
        onClick={addLine}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300/60 text-slate-500 hover:text-[#7C3AED] hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/5 transition-all"
      >
        <Plus size={15} />
        <span className="text-sm font-medium">Add line</span>
      </button>
    </div>
  );
}
