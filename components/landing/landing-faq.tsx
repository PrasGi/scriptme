'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Logo } from '@/components/common/logo';

const faqs = [
  { question: 'Do I need to pay to try ScriptMe?', answer: 'No. Start with a free account and create scripts. Paid plans unlock more AI generations and analyses per month.' },
  { question: "Can I clone any creator's style?", answer: 'You can paste a TikTok video URL and we fetch the transcript. AI then extracts style cues you can apply to your own scripts. YouTube and other sources may be added later.' },
  { question: 'What can I export?', answer: 'Scripts can be exported as plain text (.txt), JSON, or Word (.docx) with timestamps and content preserved.' },
  { question: 'Is my script data private?', answer: 'Yes. Your projects and scripts are private to your account. We use them only to provide the service and do not train public models on your content.' },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            FAQ
          </h2>
          <div className="flex items-center justify-center gap-2 text-[#8B949E] text-sm flex-wrap">
            <span>Common questions about</span>
            <Logo href="/" size="sm" />
          </div>
        </div>

        <div className="w-full space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl bg-white/[0.03] border border-white/[0.06] px-5 transition-all overflow-hidden ${
                openIndex === index ? 'border-white/[0.1]' : ''
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between py-4 font-medium text-left text-white hover:text-[#8B949E] transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {faq.question}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden text-sm transition-all ${
                  openIndex === index ? 'max-h-80' : 'max-h-0'
                }`}
              >
                <p className="text-[#8B949E] leading-relaxed pt-0 pb-4">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-[#8B949E] text-sm mb-2">More questions?</p>
          <a
            href="mailto:support@scriptminder.app"
            className="text-[#A78BFA] hover:text-[#C4B5FD] font-medium text-sm transition-colors"
          >
            Contact support
          </a>
        </div>
      </div>
    </section>
  );
}
