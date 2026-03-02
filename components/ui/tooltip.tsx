'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  description?: string;
  side?: Side;
  className?: string;
}

export function Tooltip({
  children,
  content,
  description,
  side = 'right',
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = wrapperRef.current;
    const tip = tooltipRef.current;
    if (!el || !tip) return;
    const rect = el.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (side) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        break;
      case 'top':
        top = rect.top - tipRect.height - gap;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.left - tipRect.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.right + gap;
        break;
    }

    left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));
    top = Math.max(4, Math.min(top, window.innerHeight - tipRect.height - 4));

    setCoords({ top, left });
  }, [side]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const show = () => setVisible(true);
    const hide = () => {
      setVisible(false);
      setCoords(null);
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    return () => {
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(updatePosition);
    }
  }, [visible, updatePosition]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative inline-flex', className)}
    >
      {children}
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              visibility: coords ? 'visible' : 'hidden',
            }}
          >
            <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
              <p className="text-xs font-medium text-white whitespace-nowrap">{content}</p>
              {description && (
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
