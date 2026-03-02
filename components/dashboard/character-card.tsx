import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Link2, MoreHorizontal, Wand2, Pencil, Trash2 } from 'lucide-react';

interface CharacterCardProps {
  id: string;
  name: string;
  sourceUrl?: string;
  platform?: string;
  description?: string;
  uses?: number;
  avatarInitial?: string;
  accentColor?: string;
  isCustom?: boolean;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onApply?: () => void;
}

export function CharacterCard({
  id,
  name,
  sourceUrl,
  platform,
  description,
  uses = 0,
  avatarInitial,
  accentColor = '#7C3AED',
  isCustom = false,
  className,
  onEdit,
  onDelete,
  onApply,
}: CharacterCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md p-5 shadow-sm shadow-slate-200/20',
        'hover:border-slate-300/60 hover:bg-white/80 transition-all duration-200 group',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {avatarInitial ?? name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
            {platform && <p className="text-xs text-slate-500">{platform}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <Badge variant="orange">Custom</Badge>
          ) : (
            <Badge variant="accent">Cloned</Badge>
          )}
          {(onEdit || onDelete) && (
            <div className="relative" ref={menuRef}>
              <Tooltip content="More options" description="Edit or delete this character" side="left">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="text-slate-500 hover:text-slate-800 transition-colors p-1 rounded"
                >
                  <MoreHorizontal size={16} />
                </button>
              </Tooltip>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-300/30 z-10">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100/80 flex items-center gap-2"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={async () => { setMenuOpen(false); await onDelete(); }}
                      className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{description}</p>
      )}

      {sourceUrl && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 p-2 rounded-lg bg-slate-100/60 border border-slate-200/40">
          <Link2 size={11} className="shrink-0" />
          <span className="truncate">{sourceUrl}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200/40">
        <span className="text-xs text-slate-500">Used in {uses} script{uses !== 1 ? 's' : ''}</span>
      </div>

      {(onApply || onEdit) && (
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Tooltip content="Edit character" description="Change name and style description" side="top">
              <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={onEdit}>
                Edit
              </Button>
            </Tooltip>
          )}
          {onApply && (
            <Tooltip content="Apply to script" description="Use this character's style for a script" side="top">
              <Button variant="accent" size="sm" className="flex-1 text-xs gap-1" onClick={onApply}>
                <Wand2 size={12} />
                Apply
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
