import type { Agenda, Appointment } from '@carnet/contracts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { digitizerApi, requireFacility } from '@/lib/digitizer-session';
import { APPOINTMENT_STATUS_LABEL, formatLongDate, todayInLima } from '@/lib/labels';
import { buttonClass, PANEL_CLASS } from '@/lib/ui';
import { AppointmentCard } from '../appointment-card';

export const metadata: Metadata = { title: 'Agenda' };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

interface AgendaPageProps {
  searchParams: Promise<{ fecha?: string }>;
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function Summary({ appointments }: { appointments: Appointment[] }): React.JSX.Element {
  const counts = new Map<string, number>();

  for (const appointment of appointments) {
    counts.set(appointment.status, (counts.get(appointment.status) ?? 0) + 1);
  }

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(['SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED'] as const).map((status) => (
        <div key={status} className={`${PANEL_CLASS} px-4 py-3`}>
          <dt className="text-xs text-muted">{APPOINTMENT_STATUS_LABEL[status]}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{counts.get(status) ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AgendaPage({ searchParams }: AgendaPageProps): Promise<React.JSX.Element> {
  const facility = await requireFacility();
  const today = todayInLima();
  const requested = (await searchParams).fecha;
  const date = requested !== undefined && DATE_PATTERN.test(requested) ? requested : today;
  const result = await digitizerApi<Agenda>(`/v1/digitizer/agenda?date=${date}`);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  const agenda = result.data;
  const isToday = date === today;

  return (
    <>
      <PageHeader eyebrow={facility.name} title="Agenda" description="Citas programadas en tu establecimiento. Al registrar la atención, la cita se marca sola como atendida." />

      <nav aria-label="Día" className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={`/digitador/agenda?fecha=${shift(date, -1)}`} aria-label="Día anterior" className={buttonClass('secondary', 'min-h-10 px-3')}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <p className="min-w-48 text-center text-lg font-semibold first-letter:uppercase">{isToday ? `Hoy, ${formatLongDate(date)}` : formatLongDate(date)}</p>
        <Link href={`/digitador/agenda?fecha=${shift(date, 1)}`} aria-label="Día siguiente" className={buttonClass('secondary', 'min-h-10 px-3')}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
        {isToday ? null : (
          <Link href="/digitador/agenda" className={buttonClass('ghost', 'min-h-10')}>
            Volver a hoy
          </Link>
        )}
      </nav>

      <div className="mb-6">
        <Summary appointments={agenda.appointments} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="day" className="flex flex-col gap-3">
          <h2 id="day" className="text-lg font-semibold">
            Citas del día
          </h2>
          {agenda.appointments.length === 0 ? (
            <EmptyState title="Sin citas">No hay citas programadas para este día en {facility.name}.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {agenda.appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showChild />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="overdue" className="flex flex-col gap-3">
          <h2 id="overdue" className="text-lg font-semibold">
            Atrasadas
          </h2>
          <p className="text-sm text-muted">Citas de días anteriores que siguen abiertas. Márcalas como atendidas, perdidas o reprográmalas.</p>
          {agenda.overdue.length === 0 ? (
            <EmptyState title="Al día">No hay citas atrasadas.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {agenda.overdue.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showChild />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
