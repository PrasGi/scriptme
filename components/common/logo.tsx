import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
}

const sizeMap = {
  sm: { img: 28, text: 'text-sm',  gap: 'gap-1.5' },
  md: { img: 44, text: 'text-base', gap: 'gap-2'   },
  lg: { img: 56, text: 'text-xl',  gap: 'gap-2.5'  },
};

function LogoContent({ size = 'md', className }: { size?: LogoProps['size']; className?: string }) {
  const s = sizeMap[size ?? 'md'];
  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <Image
        src="/assets/logo/logo-script-minder.png"
        alt="ScriptMinder logo"
        width={s.img}
        height={s.img}
        className="object-contain"
        priority
      />
      <span className={cn('font-bold text-white', s.text)}>
        Script<span className="text-[#06B6D4]">Minder</span>
      </span>
    </div>
  );
}

export function Logo({ size = 'md', className, href = '/' }: LogoProps) {
  return (
    <Link href={href} className="outline-none">
      <LogoContent size={size} className={className} />
    </Link>
  );
}

export function LogoStatic({ size = 'md', className }: Omit<LogoProps, 'href'>) {
  return <LogoContent size={size} className={className} />;
}
