import { cookies } from 'next/headers';
import { SIDEBAR_COOKIE } from '@/components/admin-shell/admin-nav-items';
import { AppSidebar } from '@/components/admin-shell/admin-sidebar';
import { currentFacility } from '@/lib/digitizer-session';
import { requireRole } from '@/lib/session';

export default async function DigitizerLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const account = await requireRole('DIGITIZER', '/digitador');
  const [facility, cookieStore] = await Promise.all([currentFacility(), cookies()]);

  return (
    <div className="min-h-dvh md:flex">
      <AppSidebar
        variant="digitizer"
        account={{ fullName: account.fullName, email: account.email }}
        initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === 'collapsed'}
        facility={facility === null ? null : { name: facility.name, ipressCode: facility.ipressCode }}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
