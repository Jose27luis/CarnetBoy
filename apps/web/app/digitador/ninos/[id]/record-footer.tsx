import type { RecordMeta } from '@carnet/contracts';
import { Badge } from '@/components/badge';
import { formatDateTime } from '@/lib/labels';

export function RecordFooter({ record, pending }: { record: RecordMeta; pending: boolean }): React.JSX.Element {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>
        {record.recordedByName}, {record.facilityName}. {formatDateTime(record.recordedAt)}.
      </span>
      {record.version > 1 ? <Badge tone="neutral">Corregido: {record.correctionReason}</Badge> : null}
      {pending ? <Badge tone="warn">Corrección pendiente</Badge> : null}
    </p>
  );
}

export function CatalogNotice({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="rounded-(--radius-control) border border-warn/40 bg-warn/5 px-4 py-3 text-sm">{children}</p>;
}
