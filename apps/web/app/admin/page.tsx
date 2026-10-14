import type { AdminDashboard, AnemiaClass, CatalogVersion } from '@carnet/contracts';
import { ArrowUpRight, CircleCheck, CircleDashed } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarList } from '@/components/charts/bar-list';
import { ChartCard, ChartEmpty } from '@/components/charts/chart-card';
import { ColumnChart } from '@/components/charts/column-chart';
import { DonutChart, type DonutSlice } from '@/components/charts/donut-chart';
import { KpiCard } from '@/components/charts/kpi-card';
import type { Accent } from '@/components/charts/palette';
import { SplitBar } from '@/components/charts/split-bar';
import { ANEMIA_LABEL, CATALOG_SECTIONS, formatCalendarDate, GROWTH_CLASS_LABEL } from '@/lib/labels';
import { currentAccount, loadOrFail } from '@/lib/session';

export const metadata: Metadata = { title: 'Resumen' };

const MONTH = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' });

const NUTRITION_ACCENT: Record<string, Accent> = {
  NORMAL: 'mint',
  OVERWEIGHT: 'sun',
  OBESE: 'coral',
  WASTED: 'rose',
  SEVERELY_WASTED: 'violet',
  UNDERWEIGHT: 'rose',
  SEVERELY_UNDERWEIGHT: 'violet',
  SIN_DATO: 'celeste',
};

const ANEMIA_ACCENT: Record<AnemiaClass, Accent> = {
  NONE: 'mint',
  MILD: 'sun',
  MODERATE: 'coral',
  SEVERE: 'rose',
  UNCLASSIFIED: 'celeste',
};

function monthLabel(month: string): string {
  return MONTH.format(new Date(`${month}-15T00:00:00Z`)).replace('.', '');
}

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Lima' }).format(new Date()));

  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default async function AdminHomePage(): Promise<React.JSX.Element> {
  const [account, dashboard, ...catalogs] = await Promise.all([
    currentAccount(),
    loadOrFail<AdminDashboard>('/v1/admin/dashboard'),
    ...CATALOG_SECTIONS.map((section) => loadOrFail<CatalogVersion[]>(`/v1/admin/catalogs?kind=${section.kind}`)),
  ]);
  const { totals } = dashboard;
  const nutrition: DonutSlice[] = dashboard.nutrition.map((item) => ({
    key: item.key,
    label: item.key === 'SIN_DATO' ? 'Sin referencia' : (GROWTH_CLASS_LABEL[item.key] ?? item.key),
    value: item.count,
    accent: NUTRITION_ACCENT[item.key] ?? 'celeste',
  }));
  const anemia: DonutSlice[] = dashboard.anemia.map((item) => ({
    key: item.classification,
    label: ANEMIA_LABEL[item.classification],
    value: item.count,
    accent: ANEMIA_ACCENT[item.classification],
  }));
  const appointmentsTotal = dashboard.appointments.attended + dashboard.appointments.missed + dashboard.appointments.cancelled + dashboard.appointments.open;
  const recordsTotal = dashboard.monthly.reduce((sum, month) => sum + month.doses + month.growthChecks + month.hemoglobinTests, 0);

  return (
    <>
      <header className="relative mb-8 animate-rise overflow-hidden rounded-[28px] bg-linear-to-br from-celeste-900 via-celeste-700 to-violet-500 px-6 py-8 text-white shadow-[0_30px_70px_-40px_rgba(11,79,111,0.9)] sm:px-10">
        <span aria-hidden="true" className="absolute -right-16 -top-24 size-72 animate-float rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute -bottom-24 right-40 size-56 animate-float rounded-full bg-coral-500/25 blur-2xl [animation-delay:-4s]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-celeste-100/90">Panel de administración</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
              {greeting()}, {account?.fullName.split(' ')[0] ?? ''}
            </h1>
            <p className="mt-2 text-celeste-50/90">
              {recordsTotal === 0
                ? 'Todavía no hay atenciones registradas. Cuando los digitadores empiecen, aquí verás la evolución.'
                : `En los últimos 6 meses se registraron ${recordsTotal} atenciones en todo el sistema.`}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/12 px-5 py-3 ring-1 ring-white/20 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-celeste-100/80">Citas próximas</p>
              <p className="font-display text-2xl font-semibold">{totals.upcomingAppointments}</p>
            </div>
            <Link
              href="/admin/correcciones"
              className="group rounded-2xl bg-white px-5 py-3 text-celeste-900 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-celeste-700">
                Correcciones
                <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
              <p className="font-display text-2xl font-semibold">{totals.pendingCorrections}</p>
            </Link>
          </div>
        </div>
      </header>

      <ul className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard index={0} label="Niños registrados" value={totals.children} hint="En todos los establecimientos" icon="baby" accent="celeste" />
        <KpiCard index={1} label="Apoderados activos" value={totals.activeGuardians} hint="Con vínculo vigente" icon="guardians" accent="mint" href="/admin/vinculos" />
        <KpiCard index={2} label="Digitadores activos" value={totals.activeDigitizers} hint="Pueden registrar atenciones" icon="digitizers" accent="violet" href="/admin/cuentas" />
        <KpiCard index={3} label="Establecimientos" value={totals.activeFacilities} hint="Activos en la red" icon="facilities" accent="coral" href="/admin/establecimientos" />
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard index={0} title="Atenciones por mes" subtitle="Vacunas, controles y dosajes de los últimos 6 meses" className="lg:col-span-2">
          <ColumnChart
            series={[
              { key: 'doses', label: 'Vacunas', accent: 'celeste' },
              { key: 'growthChecks', label: 'Controles', accent: 'mint' },
              { key: 'hemoglobinTests', label: 'Dosajes', accent: 'coral' },
              { key: 'registrations', label: 'Niños nuevos', accent: 'violet' },
            ]}
            groups={dashboard.monthly.map((month) => ({
              label: monthLabel(month.month),
              values: { doses: month.doses, growthChecks: month.growthChecks, hemoglobinTests: month.hemoglobinTests, registrations: month.registrations },
            }))}
          />
        </ChartCard>

        <ChartCard index={1} title="Citas de los últimos 30 días" subtitle={`${appointmentsTotal} citas en total`}>
          {appointmentsTotal === 0 ? (
            <ChartEmpty>Aún no hay citas en este periodo.</ChartEmpty>
          ) : (
            <SplitBar
              parts={[
                { key: 'attended', label: 'Atendidas', value: dashboard.appointments.attended, accent: 'mint' },
                { key: 'missed', label: 'No asistió', value: dashboard.appointments.missed, accent: 'rose' },
                { key: 'cancelled', label: 'Canceladas', value: dashboard.appointments.cancelled, accent: 'sun' },
                { key: 'open', label: 'Sin cerrar', value: dashboard.appointments.open, accent: 'celeste' },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard index={2} title="Estado nutricional" subtitle="Último control de cada niño, peso para la talla">
          {nutrition.length === 0 ? <ChartEmpty>Sin controles de crecimiento todavía.</ChartEmpty> : <DonutChart slices={nutrition} centerLabel="niños evaluados" />}
        </ChartCard>

        <ChartCard index={3} title="Anemia" subtitle="Último dosaje de cada niño, ajustado por altitud">
          {anemia.length === 0 ? <ChartEmpty>Sin dosajes de hemoglobina todavía.</ChartEmpty> : <DonutChart slices={anemia} centerLabel="niños con dosaje" />}
        </ChartCard>

        <ChartCard index={4} title="Vacunas más aplicadas" subtitle="Últimos 6 meses">
          {dashboard.topVaccines.length === 0 ? (
            <ChartEmpty>Sin vacunas aplicadas todavía.</ChartEmpty>
          ) : (
            <BarList items={dashboard.topVaccines.map((item) => ({ label: item.key, value: item.count }))} accent="celeste" unit="dosis" />
          )}
        </ChartCard>

        <ChartCard index={5} title="Establecimientos más activos" subtitle="Atenciones de los últimos 30 días" className="lg:col-span-2">
          {dashboard.facilities.length === 0 ? (
            <ChartEmpty>Sin atenciones en los últimos 30 días.</ChartEmpty>
          ) : (
            <BarList items={dashboard.facilities.map((item) => ({ label: item.key, value: item.count }))} accent="violet" unit="atenciones" />
          )}
        </ChartCard>

        <ChartCard index={6} title="Catálogos vigentes" subtitle="Lo que rige para los registros de hoy">
          <ul className="flex flex-col gap-2.5">
            {CATALOG_SECTIONS.map((section, index) => {
              const versions = catalogs[index] ?? [];
              const current = versions.find((version) => version.status === 'PUBLISHED' && version.validTo === null);
              const drafts = versions.filter((version) => version.status === 'DRAFT').length;

              return (
                <li key={section.slug}>
                  <Link
                    href={`/admin/catalogos/${section.slug}`}
                    className={`flex items-start gap-3 rounded-2xl p-3 transition-colors ${current === undefined ? 'bg-sun-50 hover:bg-sun-100' : 'bg-mint-50 hover:bg-mint-100'}`}
                  >
                    {current === undefined ? (
                      <CircleDashed aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sun-700" />
                    ) : (
                      <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-mint-700" />
                    )}
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold">{section.title}</span>
                      <span className="block truncate text-muted">
                        {current === undefined ? 'Sin versión publicada' : `Desde el ${formatCalendarDate(current.validFrom ?? '')}`}
                        {drafts > 0 ? `. ${drafts} en borrador` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>
    </>
  );
}
