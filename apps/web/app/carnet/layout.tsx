import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { MotionRoot } from '@/components/carnet/motion-root';
import { LogoutButton } from '@/components/logout-button';
import { requireRole } from '@/lib/session';

export default async function CarnetLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  await requireRole('GUARDIAN', '/carnet');

  return (
    <MotionRoot>
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(120%_60%_at_50%_0%,var(--color-celeste-100)_0%,var(--color-celeste-50)_35%,var(--color-canvas)_70%)]">
        <header className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
          <Link href="/carnet" aria-label="Inicio de tu carnet">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/carnet/avisos"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-celeste-200 bg-white px-3 text-sm font-semibold text-celeste-800 hover:bg-celeste-50"
            >
              <Bell aria-hidden="true" className="size-4" />
              Avisos
            </Link>
            <LogoutButton />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-6 sm:px-6 md:pb-12">{children}</div>
      </div>
    </MotionRoot>
  );
}
