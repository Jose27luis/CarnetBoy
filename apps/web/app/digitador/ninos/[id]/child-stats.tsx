'use client';

import { Activity, CalendarClock, Droplet, type LucideIcon, Syringe } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

export type StatKind = 'vaccines' | 'growth' | 'hemoglobin' | 'appointment';
export type StatTone = 'ok' | 'warn' | 'danger' | 'neutral';

export interface ChildStat {
  kind: StatKind;
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
  href: string;
}

const ICON: Record<StatKind, LucideIcon> = {
  vaccines: Syringe,
  growth: Activity,
  hemoglobin: Droplet,
  appointment: CalendarClock,
};

const TONE: Record<StatTone, string> = {
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-celeste-100 text-celeste-800',
};

export function ChildStats({ stats }: { stats: readonly ChildStat[] }): React.JSX.Element {
  return (
    <ul className="mb-6 grid grid-cols-2 gap-3 print:hidden lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = ICON[stat.kind];

        return (
          <motion.li
            key={stat.kind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={stat.href}
              scroll={false}
              className="group flex h-full flex-col gap-3 rounded-[18px] border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-celeste-500 hover:shadow-[0_18px_40px_-28px_rgba(11,79,111,0.6)]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">{stat.label}</span>
                <span className={`grid size-8 place-items-center rounded-[10px] ${TONE[stat.tone]}`}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </span>
              <span className="font-display text-xl font-semibold leading-tight tabular-nums">{stat.value}</span>
              <span className="text-sm text-muted">{stat.hint}</span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
