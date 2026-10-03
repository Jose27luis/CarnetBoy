import type { AdminLinkItem } from '@carnet/contracts';
import type { Metadata } from 'next';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { childDocument, formatDateTime, LINK_STATUS_LABEL, LINK_STATUS_TONE, personName, RELATIONSHIP_LABEL } from '@/lib/labels';
import { loadOrFail } from '@/lib/session';
import { buttonClass, INPUT_CLASS, PANEL_CLASS } from '@/lib/ui';
import { RevokeForm } from './revoke-form';

export const metadata: Metadata = { title: 'Vínculos de apoderados' };

interface LinksPageProps {
  searchParams: Promise<{ documento?: string }>;
}

export default async function AdminLinksPage({ searchParams }: LinksPageProps): Promise<React.JSX.Element> {
  const { documento } = await searchParams;
  const document = documento?.trim() ?? '';
  const valid = /^\d{8,12}$/.test(document);
  const links = valid ? await loadOrFail<AdminLinkItem[]>(`/v1/admin/links?document=${document}`) : [];

  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Vínculos de apoderados"
        description="Busca por el DNI o CNV del niño, o por el DNI del apoderado. Revocar un vínculo corta el acceso de inmediato y queda en la auditoría."
      />

      <form method="get" action="/admin/vinculos" role="search" className={`${PANEL_CLASS} mb-6 flex flex-col gap-2 p-5`}>
        <label htmlFor="documento" className="text-sm font-semibold">
          DNI o CNV
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="documento"
            name="documento"
            defaultValue={document}
            inputMode="numeric"
            pattern="[0-9]{8,12}"
            maxLength={12}
            required
            className={`${INPUT_CLASS} sm:max-w-sm`}
          />
          <button type="submit" className={buttonClass('primary')}>
            Buscar
          </button>
        </div>
      </form>

      {document.length > 0 && !valid ? <p className="text-danger">Ingresa solo números: de 8 a 12 dígitos.</p> : null}

      {valid && links.length === 0 ? <EmptyState title="Sin vínculos">No hay vínculos para el documento {document}.</EmptyState> : null}

      <ul className="flex flex-col gap-4">
        {links.map((link) => (
          <li key={link.id} className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">
                  {personName(link.guardian)} <span className="font-normal text-muted">({RELATIONSHIP_LABEL[link.relationship].toLowerCase()})</span>
                </p>
                <p className="text-sm text-muted">
                  Apoderado DNI {link.guardian.dni} de {personName(link.child)}, {childDocument(link.child)}
                </p>
                <p className="text-sm text-muted">
                  Vinculado en {link.facilityName} el {formatDateTime(link.createdAt)}
                  {link.revokedAt === null ? '' : `. Revocado el ${formatDateTime(link.revokedAt)}: ${link.revocationReason ?? ''}`}
                </p>
              </div>
              <Badge tone={LINK_STATUS_TONE[link.status]}>{LINK_STATUS_LABEL[link.status]}</Badge>
            </div>
            {link.status === 'REVOKED' ? null : (
              <details className="border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-danger">Revocar este vínculo</summary>
                <div className="pt-4">
                  <RevokeForm
                    linkId={link.id}
                    version={link.version}
                    description={`${personName(link.guardian)} con ${personName(link.child)}`}
                  />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
