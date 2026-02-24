'use client';

import { SectionTitle } from './section-title';
import { PenLine, Sparkles, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

const featuresData = [
  {
    icon: PenLine,
    title: 'Generate scripts',
    description: 'AI writes full video scripts from your topic or brief. Add timestamps and edit in one place.',
  },
  {
    icon: Sparkles,
    title: 'Analyze & improve',
    description: 'Get engagement score, hook analysis, and line-by-line suggestions to make every script stronger.',
  },
  {
    icon: Copy,
    title: 'Clone creator style',
    description: 'Paste a TikTok or YouTube link and clone that creator\'s voice for your own scripts.',
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="mt-32">
      <SectionTitle
        title="Everything you need for video scripts"
        description="From first draft to final cut — generate, analyze, and refine with AI built for creators."
      />

      <div className="flex flex-wrap items-center justify-center gap-6 mt-10 px-6">
        {featuresData.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="hover:-translate-y-0.5 p-6 rounded-xl space-y-4 glass max-w-80 w-full transition duration-300"
            initial={{ y: 150, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: index * 0.15,
              type: 'spring',
              stiffness: 320,
              damping: 70,
              mass: 1,
            }}
          >
            <feature.icon className="size-8 text-[#7C3AED]" />
            <h3 className="text-base font-medium text-white">{feature.title}</h3>
            <p className="text-gray-100 line-clamp-2 pb-2 text-sm">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
