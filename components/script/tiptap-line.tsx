'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Palette,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Gray', value: '#6B7280' },
];

interface TiptapLineProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  lineIndex: number;
  onAddToChat?: (context: { lineIndex: number; text: string }) => void;
}

export function TiptapLine({
  content,
  onChange,
  placeholder = 'Write something...',
  lineIndex,
  onAddToChat,
}: TiptapLineProps) {
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const lastEmittedHtml = useRef(content);
  const isInternalChange = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'w-full min-h-[36px] bg-transparent px-1 py-1.5 text-[15px] leading-relaxed text-slate-800 outline-none',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtml.current = html;
      isInternalChange.current = true;
      onChange(html);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      updateToolbarPosition(ed);
    },
    onBlur: () => {
      setTimeout(() => {
        if (toolbarRef.current?.contains(document.activeElement)) return;
        setToolbarPos(null);
        setShowColorPicker(false);
      }, 150);
    },
  });

  function updateToolbarPosition(ed: ReturnType<typeof useEditor>) {
    if (!ed) return;
    const { from, to } = ed.state.selection;
    if (from === to) {
      setToolbarPos(null);
      setShowColorPicker(false);
      return;
    }
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;
    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) {
      setToolbarPos(null);
      return;
    }
    setToolbarPos({
      top: rect.top - 44,
      left: rect.left + rect.width / 2,
    });
  }

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (content !== lastEmittedHtml.current) {
      editor.commands.setContent(content);
      lastEmittedHtml.current = content;
    }
  }, [content, editor]);

  const handleAddToChat = useCallback(() => {
    if (!editor || !onAddToChat) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) return;
    onAddToChat({ lineIndex, text: selectedText.trim() });
    setToolbarPos(null);
  }, [editor, onAddToChat, lineIndex]);

  const currentColor = editor?.getAttributes('textStyle')?.color || '';

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <EditorContent editor={editor} />

      {/* Floating formatting toolbar */}
      {toolbarPos && editor && (
        <div
          ref={toolbarRef}
          data-tiptap-toolbar
          className="fixed z-9999 flex items-center bg-white rounded-xl border border-slate-200/80 shadow-xl shadow-slate-300/30 overflow-visible"
          style={{
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-0.5 px-1 py-1">
            <ToolbarButton
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon size={14} />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            <div className="relative">
              <ToolbarButton
                active={showColorPicker}
                onClick={() => setShowColorPicker((v) => !v)}
                title="Text color"
              >
                <Palette size={14} />
                {currentColor && (
                  <div
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: currentColor }}
                  />
                )}
              </ToolbarButton>

              {showColorPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 p-2 bg-white rounded-xl border border-slate-200/80 shadow-xl shadow-slate-300/30 z-50">
                  <div className="grid grid-cols-5 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.value || 'default'}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (c.value) {
                            editor.chain().focus().setColor(c.value).run();
                          } else {
                            editor.chain().focus().unsetColor().run();
                          }
                          setShowColorPicker(false);
                        }}
                        className={cn(
                          'w-6 h-6 rounded-md transition-all hover:scale-110 border',
                          !c.value && 'bg-slate-800 border-slate-300',
                          currentColor === c.value && c.value
                            ? 'ring-2 ring-offset-1 ring-[#7C3AED]/60 scale-110'
                            : 'border-slate-200/60'
                        )}
                        style={c.value ? { backgroundColor: c.value } : undefined}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {onAddToChat && (
              <>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />
                <ToolbarButton
                  active={false}
                  onClick={handleAddToChat}
                  title="Add selection to AI chat"
                  className="gap-1 px-2"
                >
                  <Bot size={13} />
                  <span className="text-[10px] font-medium whitespace-nowrap">Ask AI</span>
                </ToolbarButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        'flex items-center justify-center h-7 min-w-7 rounded-lg transition-colors',
        active
          ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
        className
      )}
    >
      {children}
    </button>
  );
}
