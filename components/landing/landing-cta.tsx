'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function LandingCta() {
  return (
    <motion.div
      className="flex flex-col max-w-5xl mt-40 px-4 mx-auto items-center justify-center text-center py-16 rounded-xl glass"
      initial={{ y: 150, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 320, damping: 70, mass: 1 }}
    >
      <motion.h2
        className="text-2xl md:text-4xl font-medium mt-2 text-white"
        initial={{ y: 80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 280, damping: 70, mass: 1 }}
      >
        Ready to write better scripts?
      </motion.h2>
      <motion.p
        className="mt-4 text-sm leading-7 max-w-md text-gray-200"
        initial={{ y: 80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 200, damping: 70, mass: 1 }}
      >
        Get started for free. No credit card required. Create your first script in minutes.
      </motion.p>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 280, damping: 70, mass: 1 }}
      >
        <Link
          href="/register"
          className="btn-landing glass transition-none inline-flex items-center gap-2 mt-8"
        >
          Try ScriptMe free
          <ArrowRight className="size-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
