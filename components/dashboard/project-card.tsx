'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, MoreHorizontal, Calendar, BarChart2, Pencil, Trash2 } from 'lucide-react';

type ProjectStatus = 'draft' | 'analyzing' | 'ready' | 'published';

interface ProjectCardProps {
  title: string;
  description?: string;
  status: ProjectStatus;
  scripts?: number;
  score?: number;
  updatedAt?: string;
  platform?: string;
  className?: string;
  onClick?: () => void;
  onEdit?: () => void;
  /** Called when user chooses Delete (caller should show confirmation and then delete) */
  onRequestDelete?: () => void;
}

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'accent' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'accent' },
  published: { label: 'Published', variant: 'green' },
};

export function ProjectCard({
  title,
  description,
  status,
  scripts = 0,
  score,
  updatedAt,
  platform,
  className,
  onClick,
  onEdit,
  onRequestDelete,
}: ProjectCardProps) {
  const st = statusConfig[status];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md p-5 shadow-sm shadow-slate-200/20',
        'hover:border-slate-300/60 hover:bg-white/80 transition-all duration-200 group',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED]">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-[#7C3AED] transition-colors line-clamp-1">
              {title}
            </h3>
            {platform && <p className="text-xs text-slate-500">{platform}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <Badge variant={st.variant}>{st.label}</Badge>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[120px] rounded-xl border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-300/30 py-1 z-10"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100/80 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRequestDelete?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{description}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <FileText size={12} />
            <span>{scripts} script{scripts !== 1 ? 's' : ''}</span>
          </div>
          {score !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BarChart2 size={12} />
              <span>{score}/100</span>
            </div>
          )}
        </div>
        {updatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={12} />
            <span>{updatedAt}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity w-full">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 min-w-0 text-xs !text-slate-800 !bg-slate-100/90 hover:!bg-slate-200/80 !border-slate-200/60"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          type="button"
        >
          Edit
        </Button>
        <Button
          variant="accent"
          size="sm"
          className="flex-1 min-w-0 text-xs"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          type="button"
        >
          Open
        </Button>
      </div>
    </div>
  );
}
