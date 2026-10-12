'use client';

import { Activity, CalendarClock, Droplet, type LucideIcon, Syringe, UserRound } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { CHILD_TABS, type ChildTab } from './child-tab-list';

const ICON: Record<ChildTab, LucideIcon> = {
  datos: UserRound,
  vacunas: Syringe,
  crecimiento: Activity,
  hemoglobina: Droplet,
  citas: CalendarClock,
};

export function ChildTabs({ childId, active }: { childId: string; active: ChildTab }): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <nav aria-label="Secciones de la ficha" className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] print:hidden">
      <ul className="flex min-w-max gap-1 rounded-[16px] border border-line bg-white p-1.5 shadow-[0_10px_30px_-24px_rgba(11,79,111,0.5)]">
        {CHILD_TABS.map((tab) => {
          const selected = tab.slug === active;
          const Icon = ICON[tab.slug];

          return (
            <li key={tab.slug} className="relative flex-1">
              <Link
                href={tab.slug === 'datos' ? `/digitador/ninos/${childId}` : `/digitador/ninos/${childId}?seccion=${tab.slug}`}
                aria-current={selected ? 'page' : undefined}
                scroll={false}
                className={`relative flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-colors ${
                  selected ? 'text-white' : 'text-muted hover:bg-celeste-50 hover:text-ink'
                }`}
              >
                {selected ? (
                  <motion.span
                    layoutId="child-tab-indicator"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-[12px] bg-linear-to-br from-celeste-700 to-celeste-500 shadow-[0_8px_20px_-10px_rgba(11,127,179,0.8)]"
                  />
                ) : null}
                <Icon aria-hidden="true" className="relative size-4" />
                <span className="relative whitespace-nowrap">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TabPanel({ tab, children }: { tab: ChildTab; children: React.ReactNode }): React.JSX.Element {
  return (
    <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
