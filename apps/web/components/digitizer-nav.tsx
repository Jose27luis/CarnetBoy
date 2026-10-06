'use client';

import { Building2, CalendarDays, Search, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/digitador', label: 'Buscar niño', icon: Search, exact: true },
  { href: '/digitador/agenda', label: 'Agenda', icon: CalendarDays, exact: true },
  { href: '/digitador/ninos/nuevo', label: 'Registrar niño', icon: UserPlus, exact: true },
  { href: '/digitador/establecimiento', label: 'Cambiar establecimiento', icon: Building2, exact: true },
] as const;

export function DigitizerNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Digitador" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-2.5 rounded-(--radius-control) px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-celeste-100 text-celeste-900' : 'text-muted hover:bg-celeste-50 hover:text-ink'
            }`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
