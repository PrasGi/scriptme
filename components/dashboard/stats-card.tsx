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
    positive: 'text-emerald-600',
    negative: 'text-red-500',
    neutral: 'text-slate-500',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md p-5 hover:border-slate-300/60 hover:bg-white/80 transition-all shadow-sm shadow-slate-200/20',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-slate-500">{title}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        {change && (
          <div className={cn('text-xs', changeColors[changeType])}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
