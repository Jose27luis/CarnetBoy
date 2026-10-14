import type { ChildSummary, DigitizerDashboard, FacilityChildren } from '@carnet/contracts';
import { ArrowRight, CalendarClock, UserPlus, UserRoundSearch } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AreaChart } from '@/components/charts/area-chart';
import { ChartCard, ChartEmpty } from '@/components/charts/chart-card';
import { KpiCard } from '@/components/charts/kpi-card';
import { digitizerApi, requireFacility } from '@/lib/digitizer-session';
import { APPOINTMENT_TYPE_LABEL, childDocument, describeAgeFrom, formatCalendarDate, personName, SEX_LABEL, todayInLima } from '@/lib/labels';
import { buttonClass } from '@/lib/ui';
import { EmptyState } from '@/components/empty-state';
import { ChildCard } from './child-card';
import { SearchForm } from './search-form';

export const metadata: Metadata = { title: 'Buscar niño' };

const DOCUMENT_PATTERN = /^\d{8,12}$/;
const RECENT_LIMIT = 6;
const WEEK = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

interface SearchPageProps {
  searchParams: Promise<{ documento?: string }>;
}

async function load<T>(path: string): Promise<T> {
  const result = await digitizerApi<T>(path);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    throw new Error(result.error.message);
  }

  return result.data;
}

function SearchResult({ document, child }: { document: string; child: ChildSummary | null }): React.JSX.Element {
  if (child === null) {
    return (
      <div className="flex animate-rise flex-wrap items-center justify-between gap-4 rounded-[20px] border border-dashed border-coral-500/40 bg-coral-50 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-coral-700 shadow-sm">
            <UserRoundSearch aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">No hay un niño con el documento {document}</p>
            <p className="text-muted">Revisa el número. Si es correcto, regístralo ahora.</p>
          </div>
        </div>
        <Link href={`/digitador/ninos/nuevo?documento=${document}`} className={buttonClass('primary')}>
          <UserPlus aria-hidden="true" className="size-4" />
          Registrar niño
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={`/digitador/ninos/${child.id}`}
      className="group flex animate-rise flex-wrap items-center justify-between gap-4 rounded-[20px] border border-mint-100 bg-linear-to-br from-mint-50 to-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(18,122,85,0.6)]"
    >
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-mint-500 font-display text-lg font-semibold text-white">
          {child.givenNames.charAt(0)}
          {child.paternalSurname.charAt(0)}
        </span>
        <div>
          <p className="font-display text-xl font-semibold">{personName(child)}</p>
          <p className="text-muted">
            {SEX_LABEL[child.sex]}, {describeAgeFrom(child.birthDate, todayInLima())}. {childDocument(child)}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 font-semibold text-mint-700">
        Abrir ficha
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export default async function DigitizerSearchPage({ searchParams }: SearchPageProps): Promise<React.JSX.Element> {
  const facility = await requireFacility();
  const { documento } = await searchParams;
  const document = documento?.trim() ?? '';
  const searched = document.length > 0;
  const valid = DOCUMENT_PATTERN.test(document);
  const [dashboard, recent, search] = await Promise.all([
    load<DigitizerDashboard>('/v1/digitizer/dashboard'),
    load<FacilityChildren>('/v1/children'),
    searched && valid ? load<{ child: ChildSummary | null }>(`/v1/children/search?document=${document}`) : Promise.resolve(null),
  ]);
  const monthRecords = dashboard.month.doses + dashboard.month.growthChecks + dashboard.month.hemoglobinTests + dashboard.month.ironSupplies;

  return (
    <>
      <section className="relative mb-6 animate-rise overflow-hidden rounded-[28px] bg-linear-to-br from-celeste-900 via-celeste-700 to-mint-500 px-6 py-8 text-white shadow-[0_30px_70px_-40px_rgba(11,79,111,0.9)] sm:px-10">
        <span aria-hidden="true" className="absolute -right-16 -top-24 size-72 animate-float rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-28 left-1/3 size-60 animate-float rounded-full bg-sun-500/20 blur-2xl [animation-delay:-5s]" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-celeste-100/90">{facility.name}</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Buscar niño</h1>
          <p className="mt-2 text-celeste-50/90">Busca siempre antes de registrar: el niño pudo atenderse en otro establecimiento.</p>
        </div>
        <div className="relative mt-6 max-w-2xl rounded-[20px] bg-white p-4 text-ink shadow-xl sm:p-5">
          <SearchForm initialDocument={document} error={searched && !valid ? 'Ingresa solo números: 8 para el DNI, de 8 a 12 para el CNV.' : null} />
        </div>
      </section>

      {search === null ? null : (
        <section aria-live="polite" className="mb-6">
          <SearchResult document={document} child={search.child} />
        </section>
      )}

      <ul className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard index={0} label="Citas de hoy" value={dashboard.today.scheduled} hint={`${dashboard.today.attended} atendidas`} icon="calendar" accent="celeste" href="/digitador/agenda" />
        <KpiCard
          index={1}
          label="Citas atrasadas"
          value={dashboard.overdueAppointments}
          hint={dashboard.overdueAppointments === 0 ? 'Todo al día' : 'Por cerrar o reprogramar'}
          icon="corrections"
          accent={dashboard.overdueAppointments === 0 ? 'mint' : 'rose'}
          href="/digitador/agenda"
        />
        <KpiCard
          index={2}
          label="Niños registrados"
          value={recent.total}
          hint={`${dashboard.month.registrations} este mes`}
          icon="baby"
          accent="violet"
          href="/digitador/ninos"
        />
        <KpiCard index={3} label="Atenciones del mes" value={monthRecords} hint={`${dashboard.month.doses} vacunas, ${dashboard.month.growthChecks} controles`} icon="syringe" accent="coral" />
      </ul>

      <section aria-labelledby="recent-children" className="mb-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent-children" className="text-lg font-semibold">
            Registrados recientemente aquí
          </h2>
          {recent.total > 0 ? (
            <Link href="/digitador/ninos" className="inline-flex items-center gap-1 text-sm font-semibold text-celeste-700 hover:underline">
              {recent.total === 1 ? 'Ver el listado' : `Ver los ${recent.total}`}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
        {recent.children.length === 0 ? (
          <EmptyState title="Aún no hay niños registrados aquí">Busca al niño por su DNI o CNV y, si no existe, regístralo.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.children.slice(0, RECENT_LIMIT).map((child, index) => (
              <ChildCard key={child.id} child={child} today={todayInLima()} index={index} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <ChartCard index={0} title="Atenciones por semana" subtitle="Vacunas, controles, dosajes y entregas de hierro en este establecimiento">
          <AreaChart
            points={dashboard.weekly.map((week) => ({ label: WEEK.format(new Date(`${week.week}T12:00:00Z`)).replace('.', ''), value: week.records }))}
            accent="celeste"
            unit="atenciones"
          />
        </ChartCard>

        <ChartCard index={1} title="Próximas citas" subtitle="En este establecimiento">
          {dashboard.upcoming.length === 0 ? (
            <ChartEmpty>No hay citas programadas desde hoy.</ChartEmpty>
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboard.upcoming.map((appointment) => (
                <li key={`${appointment.childId}-${appointment.type}`}>
                  <Link
                    href={`/digitador/ninos/${appointment.childId}?seccion=citas`}
                    className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-canvas"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-celeste-50 text-celeste-700">
                      <CalendarClock aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{appointment.childName}</span>
                      <span className="block text-muted">{APPOINTMENT_TYPE_LABEL[appointment.type]}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-celeste-800">{formatCalendarDate(appointment.scheduledOn)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/digitador/agenda" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-celeste-700 hover:underline">
            Ver la agenda
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </ChartCard>
      </div>
    </>
  );
}
