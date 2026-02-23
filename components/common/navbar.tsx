'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0B0E14]/80 backdrop-blur-xl px-5 h-16">
          {/* Logo */}
          <Logo size="md" />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-[#8B949E] hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Get Started Free</Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-[#8B949E] hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden mx-4 mt-1 rounded-2xl border border-white/[0.06] bg-[#0B0E14]/95 backdrop-blur-xl overflow-hidden transition-all duration-300',
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#8B949E] hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-white/[0.06]">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="md" className="w-full">Sign In</Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button variant="primary" size="md" className="w-full">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
