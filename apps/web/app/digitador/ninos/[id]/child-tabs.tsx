'use client';

import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';

export const CHILD_TABS = [
  { slug: 'datos', label: 'Datos y apoderados' },
  { slug: 'vacunas', label: 'Vacunas' },
  { slug: 'crecimiento', label: 'Crecimiento' },
  { slug: 'hemoglobina', label: 'Hemoglobina y hierro' },
  { slug: 'citas', label: 'Citas' },
] as const;

export type ChildTab = (typeof CHILD_TABS)[number]['slug'];

export function ChildTabs({ childId, active }: { childId: string; active: ChildTab }): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <nav aria-label="Secciones de la ficha" className="-mx-4 mb-6 overflow-x-auto px-4 print:hidden">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {CHILD_TABS.map((tab) => {
          const selected = tab.slug === active;

          return (
            <li key={tab.slug} className="relative">
              <Link
                href={tab.slug === 'datos' ? `/digitador/ninos/${childId}` : `/digitador/ninos/${childId}?seccion=${tab.slug}`}
                aria-current={selected ? 'page' : undefined}
                scroll={false}
                className={`block px-4 py-3 text-sm font-semibold transition-colors ${selected ? 'text-celeste-800' : 'text-muted hover:text-ink'}`}
              >
                {tab.label}
              </Link>
              {selected ? (
                <motion.span
                  layoutId="child-tab-indicator"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-celeste-700"
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
