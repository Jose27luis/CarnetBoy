import { AdminNav } from '@/components/admin-nav';
import { Wordmark } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { requireRole } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const account = await requireRole('ADMIN', '/admin');

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line bg-white px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-start">
          <Wordmark />
        </div>
        <details className="mt-4 lg:hidden">
          <summary className="cursor-pointer rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-celeste-800 hover:bg-celeste-50">
            Menú
          </summary>
          <div className="pt-3">
            <AdminNav />
          </div>
        </details>
        <div className="mt-8 hidden lg:block">
          <AdminNav />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-8">
          <span className="text-right text-sm leading-tight">
            <span className="block font-semibold text-ink">{account.fullName}</span>
            <span className="block text-muted">{account.email}</span>
          </span>
          <LogoutButton />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
