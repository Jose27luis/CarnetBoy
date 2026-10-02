import type { CatalogVersion } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CATALOG_STATUS_LABEL, catalogSectionBySlug, formatCalendarDate } from '@/lib/labels';
import { loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { CreateDraftForm } from './create-draft-form';

interface CatalogPageProps {
  params: Promise<{ catalogo: string }>;
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const section = catalogSectionBySlug((await params).catalogo);

  return { title: section?.title ?? 'Catálogo' };
}

function validity(version: CatalogVersion): string {
  if (version.validFrom === null) {
    return 'Sin publicar';
  }

  return version.validTo === null
    ? `Vigente desde el ${formatCalendarDate(version.validFrom)}`
    : `Del ${formatCalendarDate(version.validFrom)} al ${formatCalendarDate(version.validTo)}`;
}

function sourceLabel(version: CatalogVersion): string {
  return `${version.norm} (${version.validFrom === null ? 'borrador' : `desde ${version.validFrom}`})`;
}

export default async function CatalogPage({ params }: CatalogPageProps): Promise<React.JSX.Element> {
  const section = catalogSectionBySlug((await params).catalogo);

  if (section === undefined) {
    notFound();
  }

  const versions = await loadOrFail<CatalogVersion[]>(`/v1/admin/catalogs?kind=${section.kind}`);

  return (
    <>
      <PageHeader eyebrow="Catálogos" title={section.title} description={section.description} />

      <section aria-labelledby="new-draft" className={`${PANEL_CLASS} mb-8 p-5`}>
        <h2 id="new-draft" className="mb-1 text-lg font-semibold">
          Nueva versión
        </h2>
        <p className="mb-4 text-sm text-muted">
          Se crea como borrador. Puedes revisarla con calma; solo empieza a regir cuando la publicas con una fecha.
        </p>
        <CreateDraftForm
          slug={section.slug}
          sources={versions.map((version) => ({ value: version.id, label: sourceLabel(version) }))}
        />
      </section>

      {versions.length === 0 ? (
        <EmptyState title="Todavía no hay versiones">
          Crea la primera con los valores de la norma técnica vigente. Carnet CRED no trae valores precargados.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {versions.map((version) => {
            const current = version.status === 'PUBLISHED' && version.validTo === null;

            return (
              <li key={version.id}>
                <Link
                  href={`/admin/catalogos/${section.slug}/${version.id}`}
                  className={`${PANEL_CLASS} flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:border-celeste-500`}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold">{version.norm}</span>
                    <span className="block text-sm text-muted">
                      {validity(version)} · {version.entryCount} {section.entryLabel}
                    </span>
                  </span>
                  <span className="flex gap-1.5">
                    {current ? <Badge tone="ok">Vigente</Badge> : null}
                    <Badge tone={version.status === 'DRAFT' ? 'warn' : 'neutral'}>{CATALOG_STATUS_LABEL[version.status]}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
