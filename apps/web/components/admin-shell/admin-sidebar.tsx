'use client';

import { Building2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark } from '../brand';
import { isActive, SHELL_NAV, type ShellVariant, SIDEBAR_COOKIE } from './admin-nav-items';

const EXPANDED_WIDTH = 264;
const COLLAPSED_WIDTH = 76;

const SHELL: Record<ShellVariant, { home: string; label: string; role: string }> = {
  admin: { home: '/admin', label: 'Administración', role: 'Administrador' },
  digitizer: { home: '/digitador', label: 'Digitador', role: 'Digitador' },
};

interface SidebarAccount {
  fullName: string;
  email: string | null;
}

interface SidebarFacility {
  name: string;
  ipressCode: string;
}

interface AppSidebarProps {
  variant: ShellVariant;
  account: SidebarAccount;
  initialCollapsed: boolean;
  facility?: SidebarFacility | null;
}

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function NavList({ variant, collapsed, onNavigate }: { variant: ShellVariant; collapsed: boolean; onNavigate?: () => void }): React.JSX.Element {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() === true;
  const groups = SHELL_NAV[variant];
  const offsets = groups.map((_, position) => groups.slice(0, position).reduce((total, group) => total + group.items.length, 0));

  return (
    <nav aria-label={SHELL[variant].label} className="flex flex-col gap-6">
      {groups.map((group, position) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className={`px-3 text-xs font-semibold uppercase tracking-wider text-celeste-200/70 ${collapsed ? 'sr-only' : ''}`}>{group.title}</p>
          {group.items.map((item, index) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;

            return (
              <motion.div
                key={item.href}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ((offsets[position] ?? 0) + index) * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-semibold transition-colors ${
                    active ? 'text-white' : 'text-celeste-100/85 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {active ? (
                    <motion.span
                      layoutId={`${variant}-nav-active`}
                      className="absolute inset-0 rounded-[12px] bg-white/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-[12px] transition-colors group-hover:bg-white/8" />
                  )}
                  {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-celeste-200" /> : null}
                  <Icon aria-hidden="true" className="relative size-[1.15rem] shrink-0 transition-transform group-hover:scale-110" />
                  <span className={`relative truncate ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function FacilityCard({ facility, collapsed }: { facility: SidebarFacility | null; collapsed: boolean }): React.JSX.Element {
  return (
    <Link
      href="/digitador/establecimiento"
      title={collapsed ? (facility?.name ?? 'Elegir establecimiento') : undefined}
      className={`flex items-center gap-3 rounded-[14px] bg-linear-to-br from-celeste-500/30 to-white/5 p-3 ring-1 ring-white/15 transition-colors hover:ring-white/30 ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/15 text-white">
        <Building2 aria-hidden="true" className="size-[1.1rem]" />
      </span>
      <span className={`min-w-0 leading-tight ${collapsed ? 'sr-only' : ''}`}>
        <span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-celeste-200/80">Trabajando en</span>
        <span className="block truncate text-sm font-semibold text-white">{facility?.name ?? 'Sin establecimiento'}</span>
        {facility === null ? null : <span className="block text-xs text-celeste-100/75">IPRESS {facility.ipressCode}</span>}
      </span>
    </Link>
  );
}

function AccountCard({ account, collapsed, role }: { account: SidebarAccount; collapsed: boolean; role: string }): React.JSX.Element {
  return (
    <div className={`flex items-center gap-3 rounded-[14px] bg-white/8 p-2.5 ring-1 ring-white/10 ${collapsed ? 'flex-col' : ''}`}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-celeste-200 to-white font-display text-sm font-semibold text-celeste-900"
      >
        {initials(account.fullName)}
      </span>
      <span className={`min-w-0 flex-1 leading-tight ${collapsed ? 'sr-only' : ''}`}>
        <span className="block truncate text-sm font-semibold text-white">{account.fullName}</span>
        <span className="block truncate text-xs text-celeste-100/80">{account.email ?? role}</span>
      </span>
      <form action="/salir" method="post">
        <button
          type="submit"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="grid size-9 place-items-center rounded-[8px] text-celeste-100 transition-colors hover:bg-white/12 hover:text-white"
        >
          <LogOut aria-hidden="true" className="size-4" />
        </button>
      </form>
    </div>
  );
}

function Brand({ collapsed, home }: { collapsed: boolean; home: string }): React.JSX.Element {
  return (
    <Link href={home} className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
      <span className="rounded-[10px] bg-white p-1 shadow-sm">
        <BrandMark className="h-7 w-auto" />
      </span>
      <span className={`font-display text-lg font-semibold text-white ${collapsed ? 'sr-only' : ''}`}>Carnet CRED</span>
    </Link>
  );
}

export function AppSidebar({ variant, account, initialCollapsed, facility }: AppSidebarProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion() === true;
  const shell = SHELL[variant];
  const showFacility = facility !== undefined;

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    }

    document.addEventListener('keydown', closeOnEscape);

    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  function toggleCollapsed(): void {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-celeste-900 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] print:hidden md:hidden">
        <Brand collapsed={false} home={shell.home} />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className="grid size-10 place-items-center rounded-[10px] text-white hover:bg-white/10"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`Menú de ${shell.label.toLowerCase()}`}
              className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col gap-6 overflow-y-auto bg-linear-to-b from-celeste-900 to-[#073a52] p-4 pt-[max(1rem,env(safe-area-inset-top))]"
              initial={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              <div className="flex items-center justify-between">
                <Brand collapsed={false} home={shell.home} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                  autoFocus
                  className="grid size-10 place-items-center rounded-[10px] text-white hover:bg-white/10"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              {showFacility ? <FacilityCard facility={facility ?? null} collapsed={false} /> : null}
              <div className="flex-1">
                <NavList variant={variant} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
              <AccountCard account={account} collapsed={false} role={shell.role} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <motion.aside
        className="sticky top-0 hidden h-dvh shrink-0 flex-col gap-7 overflow-y-auto overflow-x-hidden bg-linear-to-b from-celeste-900 to-[#073a52] px-3 py-5 print:hidden md:flex"
        initial={false}
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
          <Brand collapsed={collapsed} home={shell.home} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-pressed={collapsed}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="grid size-9 shrink-0 place-items-center rounded-[8px] text-celeste-100 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-4" /> : <PanelLeftClose aria-hidden="true" className="size-4" />}
          </button>
        </div>
        {showFacility ? <FacilityCard facility={facility ?? null} collapsed={collapsed} /> : null}
        <div className="flex-1">
          <NavList variant={variant} collapsed={collapsed} />
        </div>
        <AccountCard account={account} collapsed={collapsed} role={shell.role} />
      </motion.aside>
    </>
  );
}
