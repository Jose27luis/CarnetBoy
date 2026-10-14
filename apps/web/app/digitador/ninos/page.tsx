import type { FacilityChildren } from '@carnet/contracts';
import { Search, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { digitizerApi, requireFacility } from '@/lib/digitizer-session';
import { todayInLima } from '@/lib/labels';
import { buttonClass, INPUT_CLASS } from '@/lib/ui';
import { ChildCard } from '../child-card';

export const metadata: Metadata = { title: 'Niños del establecimiento' };

interface ChildrenPageProps {
  searchParams: Promise<{ nombre?: string }>;
}

export default async function FacilityChildrenPage({ searchParams }: ChildrenPageProps): Promise<React.JSX.Element> {
  const facility = await requireFacility();
  const name = (await searchParams).nombre?.trim() ?? '';
  const filtering = name.length >= 2;
  const result = await digitizerApi<FacilityChildren>(filtering ? `/v1/children?q=${encodeURIComponent(name)}` : '/v1/children');

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  const { total, children } = result.data;
  const today = todayInLima();

  return (
    <>
      <PageHeader
        eyebrow={facility.name}
        title="Niños del establecimiento"
        description={total === 0 ? 'Todavía no hay niños registrados aquí.' : `${total} ${total === 1 ? 'niño registrado' : 'niños registrados'} en este establecimiento.`}
        actions={
          <Link href="/digitador/ninos/nuevo" className={buttonClass('primary')}>
            <UserPlus aria-hidden="true" className="size-4" />
            Registrar niño
          </Link>
        }
      />

      <form method="get" action="/digitador/ninos" role="search" className="mb-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="child-name" className="sr-only">
          Nombre o apellido
        </label>
        <input
          id="child-name"
          name="nombre"
          defaultValue={name}
          minLength={2}
          maxLength={80}
          autoComplete="off"
          className={`${INPUT_CLASS} h-12 sm:flex-1`}
          aria-describedby="child-name-help"
        />
        <button type="submit" className={buttonClass('primary', 'h-12 px-6')}>
          <Search aria-hidden="true" className="size-4" />
          Filtrar
        </button>
        {filtering ? (
          <Link href="/digitador/ninos" className={buttonClass('ghost', 'h-12')}>
            Ver todos
          </Link>
        ) : null}
      </form>
      <p id="child-name-help" className="-mt-4 mb-6 text-sm text-muted">
        Escribe el nombre o un apellido. Para niños de otros establecimientos, busca por DNI o CNV en el inicio.
      </p>

      {children.length === 0 ? (
        <EmptyState title={filtering ? 'Sin coincidencias' : 'Sin niños registrados'}>
          {filtering ? `No hay niños registrados aquí con "${name}".` : 'Cuando registres un niño en este establecimiento aparecerá aquí.'}
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {children.map((child, index) => (
              <ChildCard key={child.id} child={child} today={today} index={index} />
            ))}
          </ul>
          {children.length < total && !filtering ? (
            <p className="mt-4 text-sm text-muted">Se muestran los {children.length} más recientes. Usa el filtro para encontrar a los demás.</p>
          ) : null}
        </>
      )}
    </>
  );
}
