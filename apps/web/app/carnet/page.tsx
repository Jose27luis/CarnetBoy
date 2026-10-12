import type { GuardianChildCard } from '@carnet/contracts';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChildCarousel } from '@/components/carnet/child-carousel';
import { ProgressRing } from '@/components/carnet/progress-ring';
import { ageInMonthsAndDays } from '@/lib/family-labels';
import { loadChildCards } from '@/lib/guardian';
import { todayInLima } from '@/lib/labels';
import { currentAccount } from '@/lib/session';

export const metadata: Metadata = { title: 'Tu carnet' };

function ChildCard({ child, today }: { child: GuardianChildCard; today: string }): React.JSX.Element {
  const reached = child.dosesApplied + child.dosesDue + child.dosesOverdue;

  return (
    <Link
      href={`/carnet/${child.id}`}
      className="group flex w-full flex-col gap-6 rounded-[24px] border border-celeste-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(11,79,111,0.45)] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-celeste-700">{ageInMonthsAndDays(child.birthDate, today)}</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">{child.givenNames}</h2>
          <p className="text-muted">
            {child.paternalSurname} {child.maternalSurname}
          </p>
        </div>
        <ChevronRight aria-hidden="true" className="mt-1 size-6 shrink-0 text-celeste-700 transition-transform group-hover:translate-x-1" />
      </div>
      <div className="flex items-center gap-5">
        <ProgressRing done={child.dosesApplied} total={reached} label="vacunas al día" />
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="font-semibold tabular-nums">{child.dosesApplied}</span> vacunas aplicadas
          </p>
          {child.dosesDue > 0 ? (
            <p className="font-semibold text-celeste-800">
              {child.dosesDue === 1 ? 'Le toca 1 vacuna' : `Le tocan ${child.dosesDue} vacunas`}
            </p>
          ) : (
            <p className="text-muted">Nada pendiente por ahora</p>
          )}
          {child.dosesOverdue > 0 ? <p className="text-warn">Consulta en tu establecimiento por {child.dosesOverdue} dosis atrasadas</p> : null}
        </div>
      </div>
    </Link>
  );
}

export default async function CarnetHomePage(): Promise<React.JSX.Element> {
  const [account, children] = await Promise.all([currentAccount(), loadChildCards()]);
  const today = todayInLima();
  const firstName = account?.fullName.split(' ')[0] ?? '';

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Hola, {firstName}</h1>
        <p className="mt-1 text-lg text-muted">
          {children.length === 0 ? 'Aquí verás el carnet de tus hijos.' : children.length === 1 ? 'Este es el carnet de tu hijo.' : 'Desliza para ver el carnet de cada uno.'}
        </p>
      </div>
      {children.length === 0 ? (
        <p className="rounded-[20px] border border-celeste-200 bg-white p-6 text-lg">
          Todavía no tienes niños vinculados. Pide en tu establecimiento de salud que te vinculen con tu DNI.
        </p>
      ) : (
        <ChildCarousel count={children.length}>
          {children.map((child) => (
            <div key={child.id} className="w-full shrink-0 snap-center px-0.5 py-1">
              <ChildCard child={child} today={today} />
            </div>
          ))}
        </ChildCarousel>
      )}
    </main>
  );
}
