'use client';

import { Building2, CalendarClock, ClipboardList, Droplet, LayoutDashboard, ScrollText, Syringe, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GROUPS = [
  {
    title: 'General',
    items: [
      { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
      { href: '/admin/cuentas', label: 'Cuentas', icon: Users },
      { href: '/admin/establecimientos', label: 'Establecimientos', icon: Building2 },
    ],
  },
  {
    title: 'Catálogos',
    items: [
      { href: '/admin/catalogos/vacunas', label: 'Vacunas', icon: Syringe },
      { href: '/admin/catalogos/esquemas', label: 'Esquemas de vacunación', icon: ClipboardList },
      { href: '/admin/catalogos/hemoglobina', label: 'Umbrales de hemoglobina', icon: Droplet },
      { href: '/admin/catalogos/citas', label: 'Intervalos de citas', icon: CalendarClock },
    ],
  },
  {
    title: 'Control',
    items: [
      { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
    ],
  },
] as const;

export function AdminNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Administración" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">{group.title}</p>
          {group.items.map((item) => {
            const active = 'exact' in item ? pathname === item.href : pathname.startsWith(item.href);
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
        </div>
      ))}
    </nav>
  );
}
