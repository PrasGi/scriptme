import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'accent' | 'green' | 'orange' | 'red' | 'purple';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-[#8B949E] border-white/[0.08]',
  accent:  'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20',
  green:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  orange:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  red:     'bg-red-500/10 text-red-400 border-red-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
