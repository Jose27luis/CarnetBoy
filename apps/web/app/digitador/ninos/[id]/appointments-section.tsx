import type { ChildSchedule } from '@carnet/contracts';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { APPOINTMENT_TYPE_LABEL, formatCalendarDate } from '@/lib/labels';
import { AppointmentCard } from '../../appointment-card';
import { ScheduleAppointment } from '../../appointment-forms';
import { CatalogNotice } from './record-footer';

export function AppointmentsSection({ childId, schedule }: { childId: string; schedule: ChildSchedule }): React.JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="upcoming" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="upcoming" className="text-lg font-semibold">
            Próximas citas
          </h2>
          <ScheduleAppointment childId={childId} />
        </div>
        {schedule.upcoming.length === 0 ? (
          <EmptyState title="Sin citas programadas">Programa la siguiente atención antes de que la familia se retire.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {schedule.upcoming.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} showChild={false} />
            ))}
          </ul>
        )}
        {schedule.history.length === 0 ? null : (
          <>
            <h2 className="pt-2 text-lg font-semibold">Historial</h2>
            <ul className="flex flex-col gap-3">
              {schedule.history.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showChild={false} />
              ))}
            </ul>
          </>
        )}
      </section>

      <aside aria-labelledby="proposals" className="flex flex-col gap-4">
        <h2 id="proposals" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles aria-hidden="true" className="size-5 text-celeste-700" />
          Sugerencias
        </h2>
        {schedule.intervalsPublished ? null : (
          <CatalogNotice>
            No hay intervalos de citas publicados, así que no se sugieren controles ni dosajes. Pide al administrador que los publique.
          </CatalogNotice>
        )}
        {schedule.proposals.length === 0 ? (
          <p className="text-sm text-muted">No hay sugerencias pendientes: cada tipo de atención ya tiene su cita o no corresponde por la edad.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {schedule.proposals.map((proposal) => (
              <li key={proposal.type} className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-panel) border border-celeste-200 bg-celeste-50 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{APPOINTMENT_TYPE_LABEL[proposal.type]}</p>
                  <p className="text-sm text-muted">
                    {formatCalendarDate(proposal.suggestedOn)}. {proposal.basis}.
                  </p>
                </div>
                <ScheduleAppointment childId={childId} proposal={proposal} />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
