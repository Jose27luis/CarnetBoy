import type { ChildSummary } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { digitizerApi, requireFacility } from '@/lib/digitizer-session';
import { childDocument, describeAgeFrom, personName, SEX_LABEL, todayInLima } from '@/lib/labels';
import { buttonClass, PANEL_CLASS } from '@/lib/ui';
import { SearchForm } from './search-form';

export const metadata: Metadata = { title: 'Buscar niño' };

const DOCUMENT_PATTERN = /^\d{8,12}$/;

interface SearchPageProps {
  searchParams: Promise<{ documento?: string }>;
}

export default async function DigitizerSearchPage({ searchParams }: SearchPageProps): Promise<React.JSX.Element> {
  await requireFacility();
  const { documento } = await searchParams;
  const document = documento?.trim() ?? '';
  const searched = document.length > 0;
  const valid = DOCUMENT_PATTERN.test(document);
  let child: ChildSummary | null = null;

  if (searched && valid) {
    const result = await digitizerApi<{ child: ChildSummary | null }>(`/v1/children/search?document=${document}`);

    if (!result.ok) {
      if (result.status === 401) {
        redirect('/ingresar');
      }

      throw new Error(result.error.message);
    }

    child = result.data.child;
  }

  return (
    <>
      <PageHeader title="Buscar niño" description="Busca siempre antes de registrar: el niño pudo atenderse en otro establecimiento." />
      <section className={`${PANEL_CLASS} p-5 sm:p-6`}>
        <SearchForm initialDocument={document} error={searched && !valid ? 'Ingresa solo números: 8 para el DNI, de 8 a 12 para el CNV.' : null} />
      </section>

      {searched && valid ? (
        <section aria-live="polite" className="mt-6">
          {child === null ? (
            <div className={`${PANEL_CLASS} flex flex-wrap items-center justify-between gap-4 border-dashed border-celeste-200 p-5`}>
              <div>
                <p className="font-display text-lg font-semibold">No hay un niño con el documento {document}</p>
                <p className="text-muted">Revisa el número. Si es correcto, regístralo ahora.</p>
              </div>
              <Link href={`/digitador/ninos/nuevo?documento=${document}`} className={buttonClass('primary')}>
                Registrar niño
              </Link>
            </div>
          ) : (
            <Link
              href={`/digitador/ninos/${child.id}`}
              className={`${PANEL_CLASS} flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-celeste-500`}
            >
              <div>
                <p className="font-display text-xl font-semibold">{personName(child)}</p>
                <p className="text-muted">
                  {SEX_LABEL[child.sex]}, {describeAgeFrom(child.birthDate, todayInLima())}. {childDocument(child)}
                </p>
              </div>
              <span className={buttonClass('secondary')}>Abrir ficha</span>
            </Link>
          )}
        </section>
      ) : null}
    </>
  );
}
