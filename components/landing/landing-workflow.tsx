'use client';

import { SectionTitle } from './section-title';
import { FolderPlus, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    id: 1,
    title: 'Create a project',
    description: 'Start a new project and give it a name. Organize scripts by campaign, channel, or client.',
    icon: FolderPlus,
  },
  {
    id: 2,
    title: 'Add scripts',
    description: 'Write scripts manually, paste a TikTok URL to fetch a transcript, or generate with AI chat.',
    icon: FileText,
  },
  {
    id: 3,
    title: 'Analyze & export',
    description: 'Run AI analysis for engagement tips, then export to .txt, .json, or .docx when you\'re ready.',
    icon: Sparkles,
  },
];

export function LandingWorkflow() {
  return (
    <section id="how-it-works" className="mt-32 relative">
      <SectionTitle
        title="From idea to finished script in minutes."
        description="Simple workflow: create a project, add scripts, and let AI help you polish and export."
      />

      <motion.div
        className="relative grid gap-12 md:grid-cols-3 mt-20 max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="flex flex-col items-center text-center p-6 rounded-2xl glass hover:-translate-y-0.5 transition duration-300"
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
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 text-[#7C3AED] mb-4">
              <step.icon className="size-7" />
            </div>
            <span className="text-xs font-medium text-white/60 mb-2">Step {step.id}</span>
            <h3 className="text-xl font-medium text-white mb-2">{step.title}</h3>
            <p className="text-gray-100 text-sm leading-6">{step.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
