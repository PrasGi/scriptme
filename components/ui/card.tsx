import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
  noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass, hover, noPadding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-200',
          glass
            ? 'bg-white/[0.03] backdrop-blur-sm border-white/[0.06]'
            : 'bg-[#161B22] border-white/[0.06]',
          hover && 'hover:border-white/[0.12] hover:bg-white/[0.05]',
          !noPadding && 'p-5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props}>{children}</div>
);

export const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold text-white', className)} {...props}>{children}</h3>
);

export const CardDescription = ({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-[#8B949E] mt-1', className)} {...props}>{children}</p>
);

export const CardContent = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(className)} {...props}>{children}</div>
);

export const CardFooter = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 pt-4 border-t border-white/[0.06]', className)} {...props}>{children}</div>
);
