'use client';

import { SectionTitle } from './section-title';
import { motion } from 'framer-motion';

const data = [
  {
    review: 'ScriptMe cut my script prep time in half. The AI analysis actually improved my hook and pacing.',
    name: 'Alex Rivera',
    about: 'YouTube creator',
  },
  {
    review: 'Being able to clone a creator\'s style and then tweak it for my brand is a game-changer. So easy.',
    name: 'Jordan Lee',
    about: 'Content strategist',
  },
  {
    review: 'Clean UI, no bloat. I just need scripts written and improved — ScriptMe does exactly that.',
    name: 'Sam Chen',
    about: 'TikTok creator',
  },
];

export function LandingTestimonials() {
  return (
    <section className="mt-32 flex flex-col items-center">
      <SectionTitle
        title="Loved by creators"
        description="See what people say about writing and polishing scripts with ScriptMe."
      />
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {data.map((item, index) => (
          <motion.div
            key={item.name}
            className="w-full space-y-5 rounded-lg glass p-5 hover:-translate-y-1 transition duration-300"
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
            <p className="text-sm font-medium text-white/70">{item.about}</p>
            <p className="line-clamp-3 text-white/90">&quot;{item.review}&quot;</p>
            <p className="text-gray-300 text-sm">— {item.name}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
