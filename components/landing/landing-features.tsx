'use client';

import { useState } from 'react';
import { PenLine, Sparkles, Copy, Users, FolderKanban, FileDown } from 'lucide-react';

const featuresData = [
  { icon: PenLine, title: 'Generate & edit scripts', description: 'Create timestamped scripts (HH:MM:SS), add lines manually, paste TikTok URLs to fetch transcripts, or generate via AI chat.' },
  { icon: Sparkles, title: 'Analyze & implement', description: 'Queue AI analysis with actionable vs informational suggestions per line. One-click apply suggestions while preserving flag colors.' },
  { icon: Copy, title: 'Clone creator style', description: "Paste a TikTok URL; AI extracts the creator's style and creates a reusable character. Use it for regenerate, analyze, and chat." },
  { icon: Users, title: 'Character personas', description: 'Create characters with name, description, platform, and accent color. Attach to scripts so AI keeps a consistent voice.' },
  { icon: FolderKanban, title: 'Projects & organization', description: 'Organize scripts in projects with title, description, platform, tags. Search and filter by Draft, Analyzing, Ready, or Published.' },
  { icon: FileDown, title: 'Export anywhere', description: 'Export scripts as plain text (.txt), JSON, or Word (.docx) when you\'re ready to shoot or hand off.' },
];

export function LandingFeatures() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Everything you need for your scripts
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            From first draft to final cut — generate, analyze, and refine with AI built for creators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={feature.title}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group relative p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border transition-all duration-300 ${
                  isHovered ? 'border-[#7C3AED]/30 shadow-[0_0_20px_rgba(124,58,237,0.08)]' : 'border-white/[0.06]'
                }`}
                style={{ transform: isHovered ? 'translateY(-4px)' : 'translateY(0)' }}
              >
                <div className="relative h-20 mb-5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Icon className="h-7 w-7 text-[#A78BFA]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[#8B949E] text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
