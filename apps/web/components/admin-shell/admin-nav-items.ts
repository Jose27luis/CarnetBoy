import {
  Building2,
  CalendarClock,
  ClipboardList,
  Droplet,
  FilePenLine,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  ScrollText,
  Syringe,
  Users,
} from 'lucide-react';

export const SIDEBAR_COOKIE = 'cc_sidebar';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: readonly NavItem[];
}

export const ADMIN_NAV: readonly NavGroup[] = [
  {
    title: 'General',
    items: [
      { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
      { href: '/admin/cuentas', label: 'Cuentas', icon: Users },
      { href: '/admin/establecimientos', label: 'Establecimientos', icon: Building2 },
      { href: '/admin/vinculos', label: 'Vínculos de apoderados', icon: Link2 },
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
      { href: '/admin/correcciones', label: 'Correcciones', icon: FilePenLine },
      { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
    ],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact === true ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
