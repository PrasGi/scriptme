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
  accentColor = '#06B6D4',
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
        'rounded-2xl border border-white/[0.06] bg-[#161B22] p-5',
        'hover:border-white/[0.12] transition-all duration-200 group',
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
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            {platform && <p className="text-xs text-[#8B949E]">{platform}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <Badge variant="orange">Custom</Badge>
          ) : (
            <Badge variant="cyan">Cloned</Badge>
          )}
          {(onEdit || onDelete) && (
            <div className="relative" ref={menuRef}>
              <Tooltip content="More options" description="Edit or delete this character" side="left">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="text-[#8B949E] hover:text-white transition-colors p-1 rounded"
                >
                  <MoreHorizontal size={16} />
                </button>
              </Tooltip>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg border border-white/10 bg-[#161B22] shadow-xl z-10">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={async () => { setMenuOpen(false); await onDelete(); }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
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
        <p className="text-xs text-[#8B949E] leading-relaxed line-clamp-3 mb-4">{description}</p>
      )}

      {sourceUrl && (
        <div className="flex items-center gap-1.5 text-xs text-[#8B949E] mb-4 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <Link2 size={11} className="flex-shrink-0" />
          <span className="truncate">{sourceUrl}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <span className="text-xs text-[#8B949E]">Used in {uses} script{uses !== 1 ? 's' : ''}</span>
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
              <Button variant="cyan" size="sm" className="flex-1 text-xs gap-1" onClick={onApply}>
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
