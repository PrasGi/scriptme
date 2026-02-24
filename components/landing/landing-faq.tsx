'use client';

import { SectionTitle } from './section-title';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const data = [
  {
    question: 'Do I need to pay to try ScriptMe?',
    answer: 'No. Start with a free account and create scripts. Paid plans unlock more AI generations and analyses per month.',
  },
  {
    question: 'Can I clone any creator\'s style?',
    answer: 'You can paste a TikTok video URL and we fetch the transcript. AI then extracts style cues you can apply to your own scripts. YouTube and other sources may be added later.',
  },
  {
    question: 'What can I export?',
    answer: 'Scripts can be exported as plain text (.txt), JSON, or Word (.docx) with timestamps and content preserved.',
  },
  {
    question: 'Is my script data private?',
    answer: 'Yes. Your projects and scripts are private to your account. We use them only to provide the service and do not train public models on your content.',
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mt-32">
      <SectionTitle
        title="FAQ"
        description="Common questions about ScriptMe and how it works."
      />
      <div className="mx-auto mt-12 space-y-4 w-full max-w-xl">
        {data.map((item, index) => (
          <motion.div
            key={index}
            className="flex flex-col glass rounded-md overflow-hidden"
            initial={{ y: 150, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 320,
              damping: 70,
              mass: 1,
            }}
          >
            <button
              type="button"
              className="flex cursor-pointer hover:bg-white/10 transition items-start justify-between gap-4 p-4 font-medium text-left text-white"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              {item.question}
              <ChevronDown
                className={`size-5 transition-all shrink-0 duration-400 ${openIndex === index ? 'rotate-180' : ''}`}
              />
            </button>
            <p
              className={`px-4 text-sm leading-6 text-gray-200 transition-all duration-400 overflow-hidden ${
                openIndex === index ? 'pt-0 pb-4 max-h-80' : 'max-h-0'
              }`}
            >
              {item.answer}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
