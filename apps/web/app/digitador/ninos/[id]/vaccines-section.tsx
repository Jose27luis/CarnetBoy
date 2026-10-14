import type { ImmunizationDose, ImmunizationStatus } from '@carnet/contracts';
import { BadgeCheck, CalendarClock, ShieldPlus, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/badge';
import { describeScheduleAge, formatCalendarDate } from '@/lib/labels';
import { CorrectRecord, RecordDose } from './clinical-forms';
import { CatalogNotice } from './record-footer';

interface VaccinesSectionProps {
  childId: string;
  birthDate: string;
  status: ImmunizationStatus;
  pendingIds: ReadonlySet<string>;
}

interface VaccineBand {
  vaccineId: string;
  name: string;
  prevents: string;
  doses: ImmunizationDose[];
}

const BAND_TONES = [
  { header: 'bg-celeste-700 text-white', body: 'bg-celeste-50/70 border-celeste-200' },
  { header: 'bg-sun-500 text-ink', body: 'bg-sun-50/70 border-sun-100' },
] as const;

const ORDINAL = ['1.ª', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª', '7.ª', '8.ª', '9.ª', '10.ª'] as const;

function bandsOf(doses: readonly ImmunizationDose[]): VaccineBand[] {
  const bands = new Map<string, VaccineBand>();

  for (const dose of [...doses].sort((first, second) => first.recommendedAgeDays - second.recommendedAgeDays || first.doseNumber - second.doseNumber)) {
    const band = bands.get(dose.vaccineId) ?? { vaccineId: dose.vaccineId, name: dose.vaccineName, prevents: dose.prevents, doses: [] };
    band.doses.push(dose);
    bands.set(dose.vaccineId, band);
  }

  return [...bands.values()];
}

function DoseSlot({ dose, childId, birthDate, lots, pending, index }: { dose: ImmunizationDose; childId: string; birthDate: string; lots: readonly string[]; pending: boolean; index: number }): React.JSX.Element {
  const context = { birthDate, recommendedAgeDays: dose.recommendedAgeDays, maxAgeDays: dose.maxAgeDays, lots };
  const applied = dose.applied;
  const label = `${ORDINAL[dose.doseNumber - 1] ?? `${dose.doseNumber}.ª`} dosis · ${describeScheduleAge(dose.recommendedAgeDays)}`;

  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}>
      <div
        className={`flex h-full flex-col gap-2 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(11,79,111,0.6)] ${
          dose.status === 'OVERDUE' ? 'border-rose-500/50' : dose.status === 'DUE' ? 'border-sun-500/60' : applied === null ? 'border-dashed border-line' : 'border-mint-500/40'
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        {applied === null ? (
          <>
            <span className="flex items-center gap-1.5 text-sm">
              {dose.status === 'OVERDUE' ? (
                <TriangleAlert aria-hidden="true" className="size-4 text-rose-700" />
              ) : (
                <CalendarClock aria-hidden="true" className={`size-4 ${dose.status === 'DUE' ? 'text-sun-700' : 'text-muted'}`} />
              )}
              {dose.status === 'FUTURE' ? `Desde el ${formatCalendarDate(dose.recommendedDate)}` : dose.status === 'DUE' ? 'Le toca ahora' : 'Vencida'}
            </span>
            {dose.status === 'FUTURE' ? null : (
              <span className="mt-auto">
                <RecordDose childId={childId} scheduledDoseId={dose.scheduledDoseId} title={`${dose.vaccineName}, ${label}`} dose={context} />
              </span>
            )}
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="size-6 shrink-0 text-mint-500" />
              <span className="leading-tight">
                <span className="block font-display font-semibold">{formatCalendarDate(applied.administeredOn)}</span>
                <span className="block text-xs text-muted">
                  Lote {applied.lot}. {applied.facilityName}
                </span>
              </span>
            </span>
            {applied.outOfRangeReason === null ? null : <span className="text-xs text-sun-700">Fuera de rango: {applied.outOfRangeReason}</span>}
            {applied.version > 1 ? <span className="text-xs text-muted">Corregida: {applied.correctionReason}</span> : null}
            <span className="mt-auto">
              {pending ? (
                <Badge tone="warn">Corrección pendiente</Badge>
              ) : (
                <CorrectRecord
                  childId={childId}
                  recordType="DOSE"
                  recordId={applied.id}
                  birthDate={birthDate}
                  canCorrectDirectly={applied.canCorrectDirectly}
                  defaults={{ administeredOn: applied.administeredOn, lot: applied.lot, outOfRangeReason: applied.outOfRangeReason ?? undefined }}
                  dose={context}
                />
              )}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

export function VaccinesSection({ childId, birthDate, status, pendingIds }: VaccinesSectionProps): React.JSX.Element {
  if (status.schedule === null) {
    return <CatalogNotice>No hay un esquema de vacunación publicado para la fecha de nacimiento de este niño. Pide al administrador que lo publique.</CatalogNotice>;
  }

  const applied = status.doses.filter((dose) => dose.status === 'APPLIED').length;
  const due = status.doses.filter((dose) => dose.status === 'DUE').length;
  const overdue = status.doses.filter((dose) => dose.status === 'OVERDUE').length;
  const reached = applied + due + overdue;
  const bands = bandsOf(status.doses);
  const offsets = bands.map((_, position) => bands.slice(0, position).reduce((total, band) => total + band.doses.length, 0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line/70 bg-linear-to-r from-white via-celeste-50 to-mint-50 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-celeste-700 to-celeste-500 text-white">
            <ShieldPlus aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Carné de vacunación</h2>
            <p className="text-sm text-muted">{status.schedule.norm}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="ok">{applied} aplicadas</Badge>
          {due > 0 ? <Badge tone="warn">{due} le tocan ahora</Badge> : null}
          {overdue > 0 ? <Badge tone="danger">{overdue} vencidas</Badge> : null}
          <Badge tone="neutral">{reached === 0 ? 'Aún no le toca ninguna' : `${Math.round((applied / reached) * 100)} % al día`}</Badge>
        </div>
      </div>

      {bands.map((band, bandIndex) => {
        const tone = BAND_TONES[bandIndex % BAND_TONES.length] ?? BAND_TONES[0];
        const startIndex = offsets[bandIndex] ?? 0;

        return (
          <section key={band.vaccineId} aria-label={band.name} className={`overflow-hidden rounded-[20px] border ${tone.body}`}>
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3">
              <span className={`rounded-lg px-3 py-1 font-display text-sm font-semibold uppercase tracking-wide ${tone.header}`}>{band.name}</span>
              <span className="text-xs text-muted">{band.prevents}</span>
            </header>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {band.doses.map((dose, index) => (
                <DoseSlot
                  key={dose.scheduledDoseId}
                  dose={dose}
                  childId={childId}
                  birthDate={birthDate}
                  lots={status.recentLots[dose.vaccineId] ?? []}
                  pending={dose.applied !== null && pendingIds.has(dose.applied.id)}
                  index={startIndex + index}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
