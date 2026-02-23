'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  description?: string;
  side?: Side;
  className?: string;
}

const sideClasses: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({
  children,
  content,
  description,
  side = 'right',
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    return () => {
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative inline-flex', className)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-[100] flex flex-col items-center',
            'pointer-events-none',
            sideClasses[side],
            'animate-tooltip-in'
          )}
        >
          <div className="rounded-lg border border-white/[0.12] bg-[#161B22] px-3 py-2 shadow-xl shadow-black/40">
            <p className="text-xs font-medium text-white whitespace-nowrap">{content}</p>
            {description && (
              <p className="text-[11px] text-[#8B949E] mt-0.5 max-w-[200px] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
