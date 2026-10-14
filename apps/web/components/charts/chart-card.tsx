'use client';

import { motion } from 'motion/react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  index?: number;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, className = '', index = 0, children }: ChartCardProps): React.JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: Math.min(index, 6) * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-4 rounded-[20px] border border-line/70 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(11,79,111,0.45)] sm:p-6 ${className}`}
    >
      <header>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle === undefined ? null : <p className="text-sm text-muted">{subtitle}</p>}
      </header>
      {children}
    </motion.section>
  );
}

export function ChartEmpty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="grid min-h-40 place-items-center rounded-2xl bg-canvas px-4 text-center text-sm text-muted">{children}</p>;
}
