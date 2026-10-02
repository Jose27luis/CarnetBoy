'use client';

import { motion, useReducedMotion } from 'motion/react';

export function FloatingCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 160, damping: 22 }}
      className="relative w-full max-w-md rounded-[20px] border border-white bg-white p-6 shadow-[0_1px_0_rgba(11,79,111,0.06),0_30px_60px_-30px_rgba(11,79,111,0.45)] ring-1 ring-celeste-100 sm:p-9"
    >
      {children}
    </motion.div>
  );
}
