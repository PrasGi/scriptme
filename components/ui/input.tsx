import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Light style for dashboard theme */
  light?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, light, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={cn(
            'block text-sm font-medium mb-1.5',
            light ? 'text-slate-600' : 'text-[#8B949E]'
          )}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2',
              light ? 'text-slate-500' : 'text-[#8B949E]'
            )}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-11 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500/40 focus:ring-red-500/30',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              light
                ? 'bg-white/80 border-slate-200/60 text-slate-800 placeholder:text-slate-400'
                : 'bg-white/[0.04] text-white placeholder:text-white/30 border-white/[0.08]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              light ? 'text-slate-500' : 'text-[#8B949E]'
            )}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
