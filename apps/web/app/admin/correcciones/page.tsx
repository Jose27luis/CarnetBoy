import { CORRECTION_STATUSES, type CorrectionRequestItem, type CorrectionStatus } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { CORRECTION_FIELD_LABEL, CORRECTION_STATUS_LABEL, describeCorrectionValue, formatDateTime, RECORD_TYPE_LABEL } from '@/lib/labels';
import { loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { approveCorrectionAction } from './actions';
import { RejectForm } from './reject-form';

export const metadata: Metadata = { title: 'Correcciones' };

interface CorrectionsPageProps {
  searchParams: Promise<{ estado?: string | string[] }>;
}

const SLUG_BY_STATUS: Record<CorrectionStatus, string> = { REQUESTED: 'pendientes', APPROVED: 'aprobadas', REJECTED: 'rechazadas' };

function statusFrom(value: string | string[] | undefined): CorrectionStatus {
  return CORRECTION_STATUSES.find((status) => SLUG_BY_STATUS[status] === value) ?? 'REQUESTED';
}

function Changes({ item }: { item: CorrectionRequestItem }): React.JSX.Element {
  const fields = [...new Set([...Object.keys(item.before), ...Object.keys(item.proposed)])].filter((field) => field !== 'confirmed');

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pr-4 font-semibold">Dato</th>
            <th className="py-2 pr-4 font-semibold">Registrado</th>
            <th className="py-2 font-semibold">Propuesto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {fields.map((field) => {
            const before = describeCorrectionValue(field, item.before[field]);
            const after = field in item.proposed ? describeCorrectionValue(field, item.proposed[field]) : before;
            const changed = before !== after;

            return (
              <tr key={field}>
                <td className="py-2 pr-4 text-muted">{CORRECTION_FIELD_LABEL[field] ?? field}</td>
                <td className={`py-2 pr-4 ${changed ? 'line-through decoration-danger/60' : ''}`}>{before}</td>
                <td className={`py-2 ${changed ? 'font-semibold text-celeste-800' : ''}`}>{after}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CorrectionCard({ item }: { item: CorrectionRequestItem }): React.JSX.Element {
  return (
    <li className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {RECORD_TYPE_LABEL[item.recordType]} de {item.childName}
          </p>
          <p className="text-sm text-muted">
            Pedida por {item.requestedByName} el {formatDateTime(item.requestedAt)}.
          </p>
        </div>
        <Badge tone={item.status === 'REQUESTED' ? 'warn' : item.status === 'APPROVED' ? 'ok' : 'neutral'}>{CORRECTION_STATUS_LABEL[item.status]}</Badge>
      </div>
      <p className="rounded-(--radius-control) bg-canvas px-3 py-2 text-sm">
        <span className="font-semibold">Motivo:</span> {item.reason}
      </p>
      <Changes item={item} />
      {item.rejectionReason === null ? null : <p className="text-sm text-muted">Rechazada: {item.rejectionReason}</p>}
      {item.status === 'REQUESTED' ? (
        <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-[auto_1fr] md:items-start">
          <ActionForm
            action={approveCorrectionAction}
            label="Aprobar"
            pendingLabel="Aprobando"
            variant="primary"
            compact={false}
            confirm="¿Aprobar la corrección? Se creará una versión nueva del registro."
            fields={{ correctionId: item.id }}
          />
          <RejectForm correctionId={item.id} />
        </div>
      ) : null}
    </li>
  );
}

export default async function CorrectionsPage({ searchParams }: CorrectionsPageProps): Promise<React.JSX.Element> {
  const status = statusFrom((await searchParams).estado);
  const items = await loadOrFail<CorrectionRequestItem[]>(`/v1/admin/corrections?status=${status}`);

  return (
    <>
      <PageHeader
        eyebrow="Control"
        title="Correcciones"
        description="Cambios a registros clínicos pedidos por los digitadores. Al aprobar, el registro anterior queda en el historial y se recalculan los resultados."
      />
      <nav aria-label="Estado" className="mb-6 flex flex-wrap gap-2">
        {CORRECTION_STATUSES.map((option) => (
          <Link
            key={option}
            href={`/admin/correcciones?estado=${SLUG_BY_STATUS[option]}`}
            aria-current={option === status ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              option === status ? 'bg-celeste-700 text-white' : 'border border-line bg-white text-muted hover:text-ink'
            }`}
          >
            {CORRECTION_STATUS_LABEL[option]}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState title="Nada por aquí">{status === 'REQUESTED' ? 'No hay correcciones pendientes.' : 'Todavía no hay correcciones en este estado.'}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <CorrectionCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
