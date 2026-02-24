import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  accent?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  accent = '#7C3AED',
  className,
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-[#8B949E]',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-[#161B22] p-5 hover:border-white/[0.1] transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-[#8B949E]">{title}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">{value}</div>
        {change && (
          <div className={cn('text-xs', changeColors[changeType])}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
