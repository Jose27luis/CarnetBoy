'use client';

import { Activity, Baby, Building2, CalendarClock, Droplet, FilePenLine, HeartHandshake, type LucideIcon, Syringe, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { AnimatedNumber } from './animated-number';
import { type Accent, ACCENT_COLOR, ACCENT_SOFT } from './palette';

const ICONS = {
  baby: Baby,
  guardians: HeartHandshake,
  digitizers: UserCheck,
  facilities: Building2,
  corrections: FilePenLine,
  calendar: CalendarClock,
  syringe: Syringe,
  growth: Activity,
  drop: Droplet,
} satisfies Record<string, LucideIcon>;

export type KpiIcon = keyof typeof ICONS;

interface KpiCardProps {
  label: string;
  value: number;
  hint: string;
  icon: KpiIcon;
  accent: Accent;
  href?: string;
  index?: number;
}

export function KpiCard({ label, value, hint, icon, accent, href, index = 0 }: KpiCardProps): React.JSX.Element {
  const Icon = ICONS[icon];
  const body = (
    <>
      <span aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full opacity-15 blur-xl transition-opacity group-hover:opacity-30" style={{ backgroundColor: ACCENT_COLOR[accent] }} />
      <span className="relative flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className={`grid size-10 place-items-center rounded-2xl bg-linear-to-br ${ACCENT_SOFT[accent]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </span>
      <span className="relative font-display text-[2rem] font-semibold leading-none">
        <AnimatedNumber value={value} />
      </span>
      <span className="relative text-sm text-muted">{hint}</span>
    </>
  );
  const className =
    'group relative flex h-full flex-col gap-3 overflow-hidden rounded-[20px] border border-line/70 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(11,79,111,0.45)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(11,79,111,0.55)]';

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {href === undefined ? (
        <div className={className}>{body}</div>
      ) : (
        <Link href={href} className={className}>
          {body}
        </Link>
      )}
    </motion.li>
  );
}
