import { Building2 } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { DigitizerNav } from '@/components/digitizer-nav';
import { LogoutButton } from '@/components/logout-button';
import { currentFacility } from '@/lib/digitizer-session';
import { requireRole } from '@/lib/session';

export default async function DigitizerLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const account = await requireRole('DIGITIZER', '/digitador');
  const facility = await currentFacility();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line bg-white px-4 py-5 print:hidden lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Wordmark />
        <div className="mt-5 rounded-(--radius-control) bg-celeste-50 px-3 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-celeste-900">
            <Building2 aria-hidden="true" className="size-4" />
            {facility?.name ?? 'Sin establecimiento elegido'}
          </p>
          {facility === null ? null : <p className="text-muted">IPRESS {facility.ipressCode}</p>}
        </div>
        <div className="mt-5">
          <DigitizerNav />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur print:hidden sm:px-8">
          <span className="text-right text-sm leading-tight">
            <span className="block font-semibold text-ink">{account.fullName}</span>
            <span className="block text-muted">Digitador</span>
          </span>
          <LogoutButton />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
