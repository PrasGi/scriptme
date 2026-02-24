'use client';

import { Github, Twitter, Linkedin } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/common/logo';

const links = [
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
];

export function LandingFooter() {
  return (
    <motion.footer
      className="flex flex-col items-center px-4 md:px-16 lg:px-24 justify-center w-full pt-16 mt-40 glass border-0 rounded-none"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Logo size="md" href="/" />

      <div className="flex flex-wrap items-center justify-center gap-8 py-8">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="text-sm text-white/80 transition hover:text-white"
          >
            {link.name}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-6 pb-6">
        <a href="#" className="hover:-translate-y-0.5 text-gray-200 transition-all duration-300" aria-label="Twitter">
          <Twitter className="size-5" />
        </a>
        <a href="#" className="hover:-translate-y-0.5 text-gray-200 transition-all duration-300" aria-label="LinkedIn">
          <Linkedin className="size-5" />
        </a>
        <a href="#" className="hover:-translate-y-0.5 text-gray-200 transition-all duration-300" aria-label="GitHub">
          <Github className="size-5" />
        </a>
      </div>
      <hr className="w-full border-white/20 mt-6" />
      <div className="flex flex-col md:flex-row items-center w-full justify-between gap-4 py-4">
        <p className="text-sm text-white/70">AI-powered video scripts for creators</p>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} ScriptMe. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
}
