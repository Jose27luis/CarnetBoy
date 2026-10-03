import type { GuardianChildName } from '@carnet/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { personName } from '@/lib/labels';
import { currentAccount, HOME_BY_ROLE, loadOrFail } from '@/lib/session';

export const metadata: Metadata = { title: 'Tu carnet' };

export default async function GuardianHomePage(): Promise<React.JSX.Element> {
  const account = await currentAccount();

  if (account === null) {
    redirect('/ingresar');
  }

  if (account.role !== 'GUARDIAN') {
    redirect(HOME_BY_ROLE[account.role]);
  }

  const children = await loadOrFail<GuardianChildName[]>('/v1/me/children');

  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(180deg,var(--color-celeste-50)_0%,var(--color-canvas)_45%)]">
      <header className="flex items-center justify-between gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
        <Wordmark />
        <LogoutButton />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-12">
        <h1 className="text-3xl font-semibold">Hola, {account.fullName.split(' ')[0]}</h1>
        {children.length === 0 ? (
          <p className="text-lg text-muted">
            Todavía no tienes niños vinculados. Pide en tu establecimiento de salud que te vinculen con tu DNI.
          </p>
        ) : (
          <>
            <p className="text-lg text-muted">Tu cuenta está activa. Pronto aquí verás vacunas, crecimiento, hemoglobina y próximas citas de:</p>
            <ul className="flex flex-col gap-2">
              {children.map((child) => (
                <li key={child.id} className="rounded-(--radius-panel) border border-celeste-200 bg-white px-4 py-3 font-display text-lg font-semibold">
                  {personName(child)}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
