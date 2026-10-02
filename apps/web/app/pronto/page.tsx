import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { ROLE_LABEL } from '@/lib/labels';
import { currentAccount } from '@/lib/session';

export const metadata: Metadata = { title: 'Tu área' };

const AREA_DESCRIPTION = {
  DIGITIZER: 'Aquí registrarás a los niños, sus apoderados, vacunas, controles CRED y dosajes de hemoglobina.',
  GUARDIAN: 'Aquí verás el carnet de tus hijos: vacunas, crecimiento, hemoglobina y próximas citas.',
} as const;

export default async function UpcomingAreaPage(): Promise<React.JSX.Element> {
  const account = await currentAccount();

  if (account === null) {
    redirect('/ingresar');
  }

  if (account.role === 'ADMIN') {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(180deg,var(--color-celeste-50)_0%,var(--color-canvas)_45%)]">
      <header className="flex items-center justify-between gap-4 px-4 pt-8 sm:px-8">
        <Wordmark />
        <LogoutButton />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-celeste-700">{ROLE_LABEL[account.role]}</p>
        <h1 className="text-3xl font-semibold">Hola, {account.fullName.split(' ')[0]}</h1>
        <p className="text-lg text-muted">{AREA_DESCRIPTION[account.role]}</p>
        <p className="rounded-(--radius-panel) border border-celeste-200 bg-white px-4 py-3 text-ink">
          Tu cuenta ya está activa. Esta área se habilitará en la siguiente etapa del sistema.
        </p>
      </main>
    </div>
  );
}
