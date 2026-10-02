import type { AuditEventItem, CatalogVersion, Facility, Page, StaffAccount } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { CATALOG_SECTIONS, describeAuditAction, formatCalendarDate, formatDateTime } from '@/lib/labels';
import { currentAccount, loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';

export const metadata: Metadata = { title: 'Resumen' };

function Stat({ value, label, href }: { value: number; label: string; href: string }): React.JSX.Element {
  return (
    <Link href={href} className={`${PANEL_CLASS} flex flex-col gap-1 p-5 transition-colors hover:border-celeste-500`}>
      <span className="font-display text-3xl font-semibold text-celeste-800 tabular-nums">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </Link>
  );
}

export default async function AdminHomePage(): Promise<React.JSX.Element> {
  const [account, accounts, facilities, recent, ...catalogs] = await Promise.all([
    currentAccount(),
    loadOrFail<StaffAccount[]>('/v1/admin/accounts'),
    loadOrFail<Facility[]>('/v1/admin/facilities'),
    loadOrFail<Page<AuditEventItem>>('/v1/admin/audit?limit=6'),
    ...CATALOG_SECTIONS.map((section) => loadOrFail<CatalogVersion[]>(`/v1/admin/catalogs?kind=${section.kind}`)),
  ]);
  const activeDigitizers = accounts.filter((staff) => staff.role === 'DIGITIZER' && staff.status === 'ACTIVE').length;
  const pendingSetup = accounts.filter((staff) => staff.status === 'ACTIVE' && (staff.passwordChangeRequired || !staff.totpEnabled)).length;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title={`Hola, ${account?.fullName.split(' ')[0] ?? ''}`}
        description="Antes de que los digitadores registren atenciones, deja listos los establecimientos y los catálogos vigentes."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat value={activeDigitizers} label="Digitadores activos" href="/admin/cuentas" />
        <Stat value={facilities.filter((facility) => facility.active).length} label="Establecimientos activos" href="/admin/establecimientos" />
        <Stat value={pendingSetup} label="Cuentas que aún no completan su primer ingreso" href="/admin/cuentas" />
      </div>

      <section aria-labelledby="catalogs" className="mb-8">
        <h2 id="catalogs" className="mb-3 text-lg font-semibold">
          Catálogos vigentes
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {CATALOG_SECTIONS.map((section, index) => {
            const versions = catalogs[index] ?? [];
            const current = versions.find((version) => version.status === 'PUBLISHED' && version.validTo === null);
            const drafts = versions.filter((version) => version.status === 'DRAFT').length;

            return (
              <li key={section.slug}>
                <Link
                  href={`/admin/catalogos/${section.slug}`}
                  className={`${PANEL_CLASS} flex h-full flex-col gap-2 p-5 transition-colors hover:border-celeste-500`}
                >
                  <span className="font-display font-semibold">{section.title}</span>
                  {current === undefined ? (
                    <Badge tone="warn">Sin versión publicada</Badge>
                  ) : (
                    <span className="text-sm text-muted">
                      {current.norm}, desde el {formatCalendarDate(current.validFrom ?? '')}
                    </span>
                  )}
                  {drafts > 0 ? <span className="text-sm text-celeste-700">{drafts} en borrador</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent" className="text-lg font-semibold">
            Actividad reciente
          </h2>
          <Link href="/admin/auditoria" className="text-sm font-semibold text-celeste-700 hover:underline">
            Ver toda la auditoría
          </Link>
        </div>
        <ol className={`${PANEL_CLASS} divide-y divide-line`}>
          {recent.items.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
              <span>
                <span className="font-semibold">{event.actor?.fullName ?? 'Consola del servidor'}</span>{' '}
                <span className="text-muted">{describeAuditAction(event.action)}</span>
              </span>
              <time dateTime={event.occurredAt} className="text-muted">
                {formatDateTime(event.occurredAt)}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
