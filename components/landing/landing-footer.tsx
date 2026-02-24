'use client';

import { Github, Twitter, Mail } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/common/logo';

export function LandingFooter() {
  return (
    <footer className="bg-black text-[#8B949E] py-16 px-4 sm:px-6 lg:px-8">
      <div
        className="h-px w-full mb-12 max-w-7xl mx-auto"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)' }}
      />

      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 mb-12">
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo href="/" size="md" />
            </div>
            <p className="text-[#8B949E] text-sm mb-6 max-w-sm leading-relaxed">
              AI-powered script writer and optimizer for content creators. Generate, analyze, and refine your scripts with AI. Clone creator styles and apply character personas.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#8B949E] hover:text-white hover:border-white/[0.12] transition-all" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#8B949E] hover:text-white hover:border-white/[0.12] transition-all" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="mailto:support@scriptminder.app" className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#8B949E] hover:text-white hover:border-white/[0.12] transition-all" aria-label="Email">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-[#8B949E] hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-sm text-[#8B949E] hover:text-white transition-colors">How it works</a></li>
              <li><a href="#pricing" className="text-sm text-[#8B949E] hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Resources</h3>
            <ul className="space-y-2.5">
              <li><a href="#faq" className="text-sm text-[#8B949E] hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-2.5">
              <li><Link href="/terms" className="text-sm text-[#8B949E] hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-[#8B949E] hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#8B949E]">
            © {new Date().getFullYear()} ScriptMe · AI-powered scripts for creators
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-[#8B949E] hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[#8B949E] hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
