'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, MoreHorizontal, Calendar, BarChart2 } from 'lucide-react';

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
  /** Navigate to edit page when Edit is clicked */
  onEdit?: () => void;
}

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'cyan' | 'green' | 'orange' | 'purple' }> = {
  draft:     { label: 'Draft',     variant: 'default' },
  analyzing: { label: 'Analyzing', variant: 'orange' },
  ready:     { label: 'Ready',     variant: 'cyan' },
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
}: ProjectCardProps) {
  const st = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-[#161B22] p-5',
        'hover:border-white/[0.12] transition-all duration-200 group',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4]">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-[#06B6D4] transition-colors line-clamp-1">
              {title}
            </h3>
            {platform && <p className="text-xs text-[#8B949E]">{platform}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          <button className="text-[#8B949E] hover:text-white transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {description && (
        <p className="text-xs text-[#8B949E] leading-relaxed line-clamp-2 mb-4">{description}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
            <FileText size={12} />
            <span>{scripts} script{scripts !== 1 ? 's' : ''}</span>
          </div>
          {score !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
              <BarChart2 size={12} />
              <span>{score}/100</span>
            </div>
          )}
        </div>
        {updatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
            <Calendar size={12} />
            <span>{updatedAt}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity w-full">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 min-w-0 text-xs"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          type="button"
        >
          Edit
        </Button>
        <Button
          variant="cyan"
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
