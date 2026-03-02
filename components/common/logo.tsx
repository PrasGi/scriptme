import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
  /** Use 'light' when the logo is on a light background so "Script" is readable (dark text). Default 'dark' for white text. */
  variant?: 'light' | 'dark';
}

const sizeMap = {
  sm: { img: 28, text: 'text-sm',  gap: 'gap-1.5' },
  md: { img: 44, text: 'text-base', gap: 'gap-2'   },
  lg: { img: 56, text: 'text-xl',  gap: 'gap-2.5'  },
};

function LogoContent({ size = 'md', className, variant = 'dark' }: { size?: LogoProps['size']; className?: string; variant?: LogoProps['variant'] }) {
  const s = sizeMap[size ?? 'md'];
  const scriptColor = variant === 'light' ? 'text-slate-800' : 'text-white';
  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <Image
        src="/assets/logo/logo-script-minder.png"
        alt="ScriptMe logo"
        width={s.img}
        height={s.img}
        className="object-contain"
        priority
      />
      <span className={cn('font-bold', scriptColor, s.text)}>
        Script<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2563EB]">Me</span>
      </span>
    </div>
  );
}

export function Logo({ size = 'md', className, href = '/', variant }: LogoProps) {
  return (
    <Link href={href} className="outline-none">
      <LogoContent size={size} className={className} variant={variant} />
    </Link>
  );
}

export function LogoStatic({ size = 'md', className, variant }: Omit<LogoProps, 'href'>) {
  return <LogoContent size={size} className={className} variant={variant} />;
}
