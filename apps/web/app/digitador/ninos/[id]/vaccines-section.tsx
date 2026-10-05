import type { ImmunizationDose, ImmunizationStatus } from '@carnet/contracts';
import { Badge } from '@/components/badge';
import { DOSE_STATUS_LABEL, DOSE_STATUS_TONE, describeScheduleAge, formatCalendarDate } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { CorrectRecord, RecordDose } from './clinical-forms';
import { CatalogNotice, RecordFooter } from './record-footer';

interface VaccinesSectionProps {
  childId: string;
  birthDate: string;
  status: ImmunizationStatus;
  pendingIds: ReadonlySet<string>;
}

function groupByAge(doses: readonly ImmunizationDose[]): [number, ImmunizationDose[]][] {
  const groups = new Map<number, ImmunizationDose[]>();

  for (const dose of doses) {
    groups.set(dose.recommendedAgeDays, [...(groups.get(dose.recommendedAgeDays) ?? []), dose]);
  }

  return [...groups.entries()].sort(([first], [second]) => first - second);
}

function DoseRow({ dose, childId, birthDate, lots, pending }: { dose: ImmunizationDose; childId: string; birthDate: string; lots: readonly string[]; pending: boolean }): React.JSX.Element {
  const context = { birthDate, recommendedAgeDays: dose.recommendedAgeDays, maxAgeDays: dose.maxAgeDays, lots };
  const title = `${dose.vaccineName}, dosis ${dose.doseNumber}`;
  const applied = dose.applied;

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {dose.vaccineName} <span className="font-normal text-muted">dosis {dose.doseNumber}</span>
          </p>
          <p className="text-sm text-muted">{dose.prevents}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={DOSE_STATUS_TONE[dose.status]}>{DOSE_STATUS_LABEL[dose.status]}</Badge>
          {applied === null && dose.status !== 'FUTURE' ? <RecordDose childId={childId} scheduledDoseId={dose.scheduledDoseId} title={title} dose={context} /> : null}
          {applied !== null && !pending ? (
            <CorrectRecord
              childId={childId}
              recordType="DOSE"
              recordId={applied.id}
              birthDate={birthDate}
              canCorrectDirectly={applied.canCorrectDirectly}
              defaults={{ administeredOn: applied.administeredOn, lot: applied.lot, outOfRangeReason: applied.outOfRangeReason ?? undefined }}
              dose={context}
            />
          ) : null}
        </div>
      </div>
      {applied === null ? (
        <p className="text-sm text-muted">
          Recomendada el {formatCalendarDate(dose.recommendedDate)}. Se puede aplicar hasta los {describeScheduleAge(dose.maxAgeDays)}.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Aplicada el {formatCalendarDate(applied.administeredOn)}, lote {applied.lot}.
            {applied.outOfRangeReason === null ? '' : ` Fuera de rango: ${applied.outOfRangeReason}.`}
          </p>
          <RecordFooter record={applied} pending={pending} />
        </>
      )}
    </li>
  );
}

export function VaccinesSection({ childId, birthDate, status, pendingIds }: VaccinesSectionProps): React.JSX.Element {
  if (status.schedule === null) {
    return <CatalogNotice>No hay un esquema de vacunación publicado para la fecha de nacimiento de este niño. Pide al administrador que lo publique.</CatalogNotice>;
  }

  const applied = status.doses.filter((dose) => dose.status === 'APPLIED').length;
  const overdue = status.doses.filter((dose) => dose.status === 'OVERDUE').length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Esquema: {status.schedule.norm}. {applied} de {status.doses.length} dosis aplicadas{overdue > 0 ? `, ${overdue} vencidas` : ''}.
      </p>
      {groupByAge(status.doses).map(([ageDays, doses]) => (
        <section key={ageDays} aria-label={describeScheduleAge(ageDays)} className={`${PANEL_CLASS} p-5`}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-celeste-800">{describeScheduleAge(ageDays)}</h2>
          <ul className="divide-y divide-line">
            {doses.map((dose) => (
              <DoseRow
                key={dose.scheduledDoseId}
                dose={dose}
                childId={childId}
                birthDate={birthDate}
                lots={status.recentLots[dose.vaccineId] ?? []}
                pending={dose.applied !== null && pendingIds.has(dose.applied.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
