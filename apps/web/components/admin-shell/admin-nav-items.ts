import {
  Baby,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Droplet,
  FilePenLine,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  ScrollText,
  Search,
  Syringe,
  UserPlus,
  Users,
} from 'lucide-react';

export const SIDEBAR_COOKIE = 'cc_sidebar';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  pattern?: RegExp;
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

export const DIGITIZER_NAV: readonly NavGroup[] = [
  {
    title: 'Atención',
    items: [
      { href: '/digitador', label: 'Buscar niño', icon: Search, exact: true },
      { href: '/digitador/ninos', label: 'Niños registrados', icon: Baby, exact: true, pattern: /^\/digitador\/ninos\/(?!nuevo$)[^/]+/ },
      { href: '/digitador/ninos/nuevo', label: 'Registrar niño', icon: UserPlus, exact: true },
      { href: '/digitador/agenda', label: 'Agenda', icon: CalendarDays, exact: true },
    ],
  },
  {
    title: 'Trabajo',
    items: [{ href: '/digitador/establecimiento', label: 'Cambiar establecimiento', icon: Building2, exact: true }],
  },
];

export const SHELL_NAV = { admin: ADMIN_NAV, digitizer: DIGITIZER_NAV } as const;

export type ShellVariant = keyof typeof SHELL_NAV;

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.pattern?.test(pathname) === true) {
    return true;
  }

  return item.exact === true ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
