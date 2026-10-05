import { cookies } from 'next/headers';
import { SIDEBAR_COOKIE } from '@/components/admin-shell/admin-nav-items';
import { AdminSidebar } from '@/components/admin-shell/admin-sidebar';
import { requireRole } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const account = await requireRole('ADMIN', '/admin');
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';

  return (
    <div className="min-h-dvh md:flex">
      <AdminSidebar account={{ fullName: account.fullName, email: account.email }} initialCollapsed={collapsed} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
