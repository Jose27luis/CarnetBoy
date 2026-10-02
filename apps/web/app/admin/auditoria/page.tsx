import type { AuditEventItem, Page } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { describeAuditAction, formatDateTime } from '@/lib/labels';
import { loadOrFail } from '@/lib/session';
import { buttonClass, PANEL_CLASS } from '@/lib/ui';

export const metadata: Metadata = { title: 'Auditoría' };

const ENTITY_FILTERS = [
  { value: '', label: 'Todo' },
  { value: 'account', label: 'Cuentas' },
  { value: 'facility', label: 'Establecimientos' },
  { value: 'vaccine', label: 'Vacunas' },
  { value: 'catalog_version', label: 'Catálogos' },
] as const;

interface AuditPageProps {
  searchParams: Promise<{ entidad?: string; desde?: string }>;
}

function hasDetail(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function queryString(entity: string, cursor: string | null): string {
  const params = new URLSearchParams();

  if (entity.length > 0) {
    params.set('entidad', entity);
  }

  if (cursor !== null) {
    params.set('desde', cursor);
  }

  const text = params.toString();

  return text.length === 0 ? '/admin/auditoria' : `/admin/auditoria?${text}`;
}

export default async function AuditPage({ searchParams }: AuditPageProps): Promise<React.JSX.Element> {
  const { entidad = '', desde } = await searchParams;
  const entity = ENTITY_FILTERS.some((filter) => filter.value === entidad) ? entidad : '';
  const params = new URLSearchParams({ limit: '50' });

  if (entity.length > 0) {
    params.set('entity', entity);
  }

  if (desde !== undefined && /^\d{1,19}$/.test(desde)) {
    params.set('cursor', desde);
  }

  const page = await loadOrFail<Page<AuditEventItem>>(`/v1/admin/audit?${params.toString()}`);

  return (
    <>
      <PageHeader
        eyebrow="Control"
        title="Auditoría"
        description="Registro de todo lo que cambia en el sistema, con quién lo hizo y cuándo. No se puede editar ni borrar."
      />

      <nav aria-label="Filtrar por tipo" className="mb-6 flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={queryString(filter.value, null)}
            aria-current={entity === filter.value ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              entity === filter.value ? 'bg-celeste-700 text-white' : 'border border-line bg-white text-muted hover:text-ink'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <EmptyState title="Sin eventos">Todavía no hay eventos para este filtro.</EmptyState>
      ) : (
        <ol className={`${PANEL_CLASS} divide-y divide-line`}>
          {page.items.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {event.actor?.fullName ?? 'Consola del servidor'}{' '}
                  <span className="font-normal text-muted">{describeAuditAction(event.action)}</span>
                </p>
                <time dateTime={event.occurredAt} className="text-sm text-muted">
                  {formatDateTime(event.occurredAt)}
                </time>
              </div>
              {hasDetail(event.before) || hasDetail(event.after) ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-celeste-700">Ver detalle</summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {hasDetail(event.before) ? (
                      <pre className="overflow-x-auto rounded-(--radius-control) bg-canvas p-3 text-xs">
                        Antes{'\n'}
                        {JSON.stringify(event.before, null, 2)}
                      </pre>
                    ) : null}
                    {hasDetail(event.after) ? (
                      <pre className="overflow-x-auto rounded-(--radius-control) bg-canvas p-3 text-xs">
                        Después{'\n'}
                        {JSON.stringify(event.after, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {page.nextCursor === null ? null : (
        <div className="mt-6">
          <Link href={queryString(entity, page.nextCursor)} className={buttonClass('secondary')}>
            Ver eventos anteriores
          </Link>
        </div>
      )}
    </>
  );
}
