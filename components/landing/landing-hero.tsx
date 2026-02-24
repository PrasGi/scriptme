'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

export function LandingHero() {
  return (
    <motion.section className="flex flex-col items-center px-4">
      <motion.div
        className="flex items-center gap-3 mt-32"
        initial={{ y: -20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 70, mass: 1 }}
      >
        <p className="text-sm text-white/80">Smart, fast, creator-ready.</p>
        <Link href="/register" className="btn-landing glass py-1 px-3 text-xs">
          Launch App
        </Link>
      </motion.div>
      <motion.h1
        className="text-center text-4xl leading-[1.2] md:text-6xl md:leading-[1.2] mt-4 font-semibold tracking-tight max-w-3xl text-white"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 240, damping: 70, mass: 1 }}
      >
        Write, Analyze & Polish Video Scripts with AI.
      </motion.h1>
      <motion.p
        className="text-center text-gray-100 text-base leading-7 max-w-md mt-6"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 70, mass: 1 }}
      >
        Generate scripts, clone any creator&apos;s style, and get AI feedback to boost engagement — all in one place.
      </motion.p>

      <motion.div
        className="flex flex-col md:flex-row max-md:w-full items-center gap-4 md:gap-3 mt-6"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 320, damping: 70, mass: 1 }}
      >
        <Link href="/register" className="btn-landing max-md:w-full glass py-3 text-center">
          Get Started Free
        </Link>
        <Link
          href="#how-it-works"
          className="btn-landing max-md:w-full glass flex items-center justify-center gap-2 py-3"
        >
          <PlayCircle className="size-4" />
          See How It Works
        </Link>
      </motion.div>
    </motion.section>
  );
}
