'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';

const links = [
  { name: 'Features', href: '#features' },
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-4 right-4 z-50 md:left-8 md:right-8 max-w-full">
      <nav className="bg-black/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl px-6 py-4 w-full max-w-full overflow-visible">
        <div className="flex items-center justify-between gap-4 max-w-full">
          <Logo href="/" size="md" />

          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[#8B949E] hover:text-white transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-white/[0.06]"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" className="text-[#8B949E] hover:text-white hover:bg-white/[0.06] rounded-xl">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-white/90 rounded-xl font-semibold px-6 transition-all">
                Get Started Free
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/[0.06] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/[0.08] overflow-hidden">
            <div className="space-y-1">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-[#8B949E] hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 mt-2 space-y-2 border-t border-white/[0.06]">
                <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full text-[#8B949E] hover:text-white rounded-xl hover:bg-white/[0.06]">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-white text-black hover:bg-white/90 rounded-xl font-semibold">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
