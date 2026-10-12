'use client';

import { Activity, Droplet, House, type LucideIcon, ScrollText, Syringe } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  segment: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: readonly NavItem[] = [
  { segment: '', label: 'Inicio', icon: House },
  { segment: 'vacunas', label: 'Vacunas', icon: Syringe },
  { segment: 'crecimiento', label: 'Crecimiento', icon: Activity },
  { segment: 'hemoglobina', label: 'Hemoglobina', icon: Droplet },
  { segment: 'historia', label: 'Historia', icon: ScrollText },
];

export function CarnetNav({ childId }: { childId: string }): React.JSX.Element {
  const pathname = usePathname();
  const base = `/carnet/${childId}`;

  return (
    <nav
      aria-label="Secciones del carnet"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-celeste-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mb-6 md:rounded-[18px] md:border md:bg-white"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ITEMS.map((item) => {
          const href = item.segment === '' ? base : `${base}/${item.segment}`;
          const active = pathname === href;
          const Icon = item.icon;

          return (
            <li key={item.segment} className="relative">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${active ? 'text-celeste-800' : 'text-muted'}`}
              >
                <Icon aria-hidden="true" className="size-5" />
                {item.label}
              </Link>
              {active ? (
                <motion.span
                  layoutId="carnet-nav-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-celeste-700 md:bottom-0 md:top-auto"
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
