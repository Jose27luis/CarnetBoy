'use client';

import { Activity, CalendarClock, Droplet, type LucideIcon, Pill, Syringe } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { formatCalendarDate } from '@/lib/labels';

export type TimelineKind = 'VACCINE' | 'GROWTH' | 'HEMOGLOBIN' | 'IRON' | 'APPOINTMENT';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  date: string;
  title: string;
  detail: string;
  upcoming: boolean;
}

const KIND: Record<TimelineKind, { label: string; icon: LucideIcon; tone: string }> = {
  VACCINE: { label: 'Vacunas', icon: Syringe, tone: 'bg-celeste-700 text-white' },
  GROWTH: { label: 'Controles', icon: Activity, tone: 'bg-ok text-white' },
  HEMOGLOBIN: { label: 'Hemoglobina', icon: Droplet, tone: 'bg-danger text-white' },
  IRON: { label: 'Hierro', icon: Pill, tone: 'bg-warn text-white' },
  APPOINTMENT: { label: 'Citas', icon: CalendarClock, tone: 'bg-white text-celeste-800 ring-2 ring-celeste-500' },
};

const FILTERS: readonly (TimelineKind | 'ALL')[] = ['ALL', 'VACCINE', 'GROWTH', 'HEMOGLOBIN', 'IRON', 'APPOINTMENT'];

export function Timeline({ items }: { items: readonly TimelineItem[] }): React.JSX.Element {
  const [filter, setFilter] = useState<TimelineKind | 'ALL'>('ALL');
  const visible = items.filter((item) => filter === 'ALL' || item.kind === filter);

  return (
    <div className="flex flex-col gap-5">
      <div role="toolbar" aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === option ? 'bg-celeste-700 text-white' : 'border border-celeste-200 bg-white text-muted'
            }`}
          >
            {option === 'ALL' ? 'Todo' : KIND[option].label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[20px] border border-celeste-200 bg-white p-5 text-muted">Aún no hay atenciones de este tipo.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 pl-12 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-0.5 before:bg-celeste-200">
          <AnimatePresence initial={false}>
            {visible.map((item) => {
              const kind = KIND[item.kind];
              const Icon = kind.icon;

              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <span className={`absolute -left-12 top-1 grid size-10 place-items-center rounded-full ${kind.tone}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className={`rounded-[18px] border p-4 ${item.upcoming ? 'border-dashed border-celeste-500 bg-celeste-50' : 'border-celeste-200 bg-white'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-celeste-700">
                      {item.upcoming ? 'Próximamente, ' : ''}
                      {formatCalendarDate(item.date)}
                    </p>
                    <p className="mt-1 font-semibold">{item.title}</p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
