import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { CarnetNav } from '@/components/carnet/carnet-nav';
import { ageInMonthsAndDays } from '@/lib/family-labels';
import { loadCarnet, loadChildCards } from '@/lib/guardian';
import { todayInLima } from '@/lib/labels';

interface ChildLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ChildCarnetLayout({ children, params }: ChildLayoutProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const [carnet, cards] = await Promise.all([loadCarnet(id), loadChildCards()]);
  const child = carnet.child;
  const siblings = cards.filter((card) => card.id !== child.id);

  return (
    <>
      <div className="mb-5 flex flex-col gap-4">
        <Link href="/carnet" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-celeste-700 hover:underline">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Mis hijos
        </Link>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">{child.givenNames}</h1>
          <p className="text-muted">
            {ageInMonthsAndDays(child.birthDate, todayInLima())}
            {child.gestationalWeeks !== null && child.gestationalWeeks < 37 ? `. Nació a las ${child.gestationalWeeks} semanas` : ''}
          </p>
        </div>
        {siblings.length === 0 ? null : (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                href={`/carnet/${sibling.id}`}
                className="shrink-0 rounded-full border border-celeste-200 bg-white px-4 py-1.5 text-sm font-semibold text-celeste-800 hover:bg-celeste-50"
              >
                Ver a {sibling.givenNames.split(' ')[0]}
              </Link>
            ))}
          </div>
        )}
      </div>
      <CarnetNav childId={child.id} />
      <main className="flex flex-col gap-6">{children}</main>
    </>
  );
}
