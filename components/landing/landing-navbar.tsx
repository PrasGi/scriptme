'use client';

import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/common/logo';

const links = [
  { name: 'Features', href: '#features' },
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`sticky top-0 z-50 flex w-full items-center justify-between px-4 py-3.5 md:px-16 lg:px-24 transition-colors ${isScrolled ? 'bg-white/15 backdrop-blur-lg' : ''}`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 70, mass: 1 }}
      >
        <Logo href="/" size="md" />

        <div className="hidden items-center space-x-10 md:flex">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm text-white/90 transition hover:text-white"
            >
              {link.name}
            </Link>
          ))}
          <Link href="/register" className="btn-landing glass">
            Sign Up
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="transition active:scale-90 md:hidden text-white"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
      </motion.nav>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/20 text-lg font-medium backdrop-blur-2xl transition duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            onClick={() => setIsOpen(false)}
            className="text-white"
          >
            {link.name}
          </Link>
        ))}
        <Link href="/register" className="btn-landing glass" onClick={() => setIsOpen(false)}>
          Sign Up
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md p-2 glass"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
    </>
  );
}
