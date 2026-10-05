'use client';

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark } from '../brand';
import { ADMIN_NAV, isActive, SIDEBAR_COOKIE } from './admin-nav-items';

const EXPANDED_WIDTH = 264;
const COLLAPSED_WIDTH = 76;

interface SidebarAccount {
  fullName: string;
  email: string | null;
}

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Administración" className="flex flex-col gap-6">
      {ADMIN_NAV.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className={`px-3 text-xs font-semibold text-celeste-200/80 ${collapsed ? 'sr-only' : ''}`}>{group.title}</p>
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
                  active ? 'text-white' : 'text-celeste-100/85 hover:bg-white/8 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {active ? (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute inset-0 rounded-[10px] bg-white/14 ring-1 ring-white/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
                {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-celeste-200" /> : null}
                <Icon aria-hidden="true" className="relative size-[1.15rem] shrink-0" />
                <span className={`relative truncate ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function AccountCard({ account, collapsed }: { account: SidebarAccount; collapsed: boolean }): React.JSX.Element {
  return (
    <div className={`flex items-center gap-3 rounded-[12px] bg-white/8 p-2.5 ${collapsed ? 'flex-col' : ''}`}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-celeste-200 font-display text-sm font-semibold text-celeste-900"
      >
        {initials(account.fullName)}
      </span>
      <span className={`min-w-0 flex-1 leading-tight ${collapsed ? 'sr-only' : ''}`}>
        <span className="block truncate text-sm font-semibold text-white">{account.fullName}</span>
        <span className="block truncate text-xs text-celeste-100/80">{account.email ?? 'Administrador'}</span>
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

function Brand({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return (
    <Link href="/admin" className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
      <span className="rounded-[10px] bg-white p-1">
        <BrandMark className="h-7 w-auto" />
      </span>
      <span className={`font-display text-lg font-semibold text-white ${collapsed ? 'sr-only' : ''}`}>Carnet CRED</span>
    </Link>
  );
}

export function AdminSidebar({ account, initialCollapsed }: { account: SidebarAccount; initialCollapsed: boolean }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion() === true;

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
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-celeste-900 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <Brand collapsed={false} />
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
              className="absolute inset-0 bg-ink/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menú de administración"
              className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col gap-6 overflow-y-auto bg-celeste-900 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
              initial={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              <div className="flex items-center justify-between">
                <Brand collapsed={false} />
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
              <div className="flex-1">
                <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
              <AccountCard account={account} collapsed={false} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <motion.aside
        className="sticky top-0 hidden h-dvh shrink-0 flex-col gap-8 overflow-y-auto overflow-x-hidden bg-celeste-900 px-3 py-5 md:flex"
        initial={false}
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
          <Brand collapsed={collapsed} />
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
        <div className="flex-1">
          <NavList collapsed={collapsed} />
        </div>
        <AccountCard account={account} collapsed={collapsed} />
      </motion.aside>
    </>
  );
}
