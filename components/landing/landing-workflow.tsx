'use client';

import { FolderPlus, FileText, Sparkles, FileDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const steps = [
  { number: '1', icon: FolderPlus, title: 'Create a project', description: 'Start a new project with title, description, platform, and tags. Organize scripts by campaign or channel.' },
  { number: '2', icon: FileText, title: 'Add scripts', description: 'Write manually, paste a TikTok URL to fetch transcript, or generate with AI chat. Attach a character for style context.' },
  { number: '3', icon: Sparkles, title: 'Analyze & implement', description: 'Run AI analysis for per-line suggestions. One-click apply actionable tips. Use Regenerate for full rewrites.' },
  { number: '4', icon: FileDown, title: 'Export', description: 'Export to .txt, .json, or .docx when you\'re ready. Preserves timestamps and structure.' },
];

export function LandingWorkflow() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#7C3AED]/10 blur-[100px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            From idea to finished script in minutes
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            Simple workflow: create a project, add scripts, and let AI help you polish and export.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-14 left-[calc(50%+2rem)] w-[calc(100%-3rem)] h-0.5 rounded-full -z-10"
                    style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }}
                  />
                )}

                <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-6 lg:p-7 hover:border-white/[0.1] transition-all duration-300 h-full">
                  <div className="absolute -top-2.5 left-6 w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
                    {step.number}
                  </div>

                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.08] mb-5">
                    <Icon className="h-7 w-7 text-[#A78BFA]/90" />
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-[#8B949E] text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-14">
          <p className="text-[#8B949E] mb-5">Ready to write better scripts?</p>
          <Link href="/register">
            <Button className="bg-white text-black hover:bg-white/90 rounded-xl font-semibold px-8 h-12 text-base transition-all gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
