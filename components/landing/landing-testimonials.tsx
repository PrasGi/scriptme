'use client';

import { Star, Quote } from 'lucide-react';

const testimonials = [
  { name: 'Alex R.', role: 'YouTube creator', initial: 'AR', text: 'ScriptMe cut my script prep time in half. The AI analysis actually improved my hook and pacing.', large: true },
  { name: 'Jordan L.', role: 'Content strategist', initial: 'JL', text: "Being able to clone a creator's style and then tweak it for my brand is a game-changer. So easy.", large: false },
  { name: 'Sam C.', role: 'TikTok creator', initial: 'SC', text: 'Clean UI, no bloat. I just need scripts written and improved — ScriptMe does exactly that.', large: false },
];

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Loved by creators
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            See what people say about writing and polishing scripts with ScriptMe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className={`rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-6 lg:p-7 hover:border-white/[0.1] transition-all duration-300 ${
                item.large ? 'lg:col-span-2 lg:min-h-[220px]' : ''
              }`}
            >
              <div className="relative h-full flex flex-col">
                <div className="absolute top-5 right-5 text-white/[0.06]">
                  <Quote className="h-8 w-8" />
                </div>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400/80 fill-amber-400/80" />
                  ))}
                </div>
                <p className="text-[#8B949E] leading-relaxed text-sm lg:text-base flex-1 mb-6">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#7C3AED]/20 border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-[#A78BFA]">
                    {item.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{item.name}</div>
                    <div className="text-xs text-[#8B949E]">{item.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
