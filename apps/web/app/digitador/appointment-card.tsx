import type { Appointment } from '@carnet/contracts';
import Link from 'next/link';
import { Badge } from '@/components/badge';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE, APPOINTMENT_TYPE_LABEL, formatCalendarDate, formatDateTime } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { AppointmentActions } from './appointment-forms';

export function AppointmentCard({ appointment, showChild }: { appointment: Appointment; showChild: boolean }): React.JSX.Element {
  return (
    <li className={`${PANEL_CLASS} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {showChild ? (
            <Link href={`/digitador/ninos/${appointment.childId}`} className="font-semibold text-celeste-800 hover:underline">
              {appointment.childName}
            </Link>
          ) : null}
          <p className={showChild ? 'text-sm' : 'font-semibold'}>
            {APPOINTMENT_TYPE_LABEL[appointment.type]}, {formatCalendarDate(appointment.scheduledOn)}
          </p>
          <p className="text-sm text-muted">
            {appointment.facilityName}. Programada por {appointment.createdByName}
            {appointment.origin === 'SYSTEM' ? ' con la fecha sugerida' : ''}.
          </p>
        </div>
        <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status]}>{APPOINTMENT_STATUS_LABEL[appointment.status]}</Badge>
      </div>
      {appointment.note === null ? null : <p className="rounded-(--radius-control) bg-celeste-50 px-3 py-2 text-sm">{appointment.note}</p>}
      {appointment.cancelReason === null ? null : <p className="text-sm text-muted">Motivo: {appointment.cancelReason}</p>}
      {appointment.status === 'SCHEDULED' ? (
        <AppointmentActions appointment={appointment} />
      ) : appointment.closedAt === null ? null : (
        <p className="text-xs text-muted">Cerrada el {formatDateTime(appointment.closedAt)}.</p>
      )}
    </li>
  );
}
