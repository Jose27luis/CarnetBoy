import type { GrowthBands, GrowthCheckRecord, IronSupplyRecord } from '@carnet/contracts';
import { Badge } from '@/components/badge';
import { GrowthCurves } from '@/components/charts/growth-curves';
import { EmptyState } from '@/components/empty-state';
import { describeScheduleAge, formatCalendarDate, GROWTH_CLASS_LABEL, growthClassTone, POSITION_LABEL } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { CareGrid } from './care-grid';
import { CorrectRecord, RecordGrowth } from './clinical-forms';
import { RecordFooter } from './record-footer';

interface GrowthSectionProps {
  childId: string;
  birthDate: string;
  ageDays: number;
  checks: readonly GrowthCheckRecord[];
  supplies: readonly IronSupplyRecord[];
  bands: GrowthBands;
  pendingIds: ReadonlySet<string>;
}

function Indicator({ label, z, classification }: { label: string; z: string | null; classification: string | null }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-(--radius-control) bg-canvas px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <span className="font-semibold tabular-nums">{z === null ? 'Fuera de la tabla' : `z ${z}`}</span>
        {classification === null ? null : <Badge tone={growthClassTone(classification)}>{GROWTH_CLASS_LABEL[classification] ?? classification}</Badge>}
      </dd>
    </div>
  );
}

function CheckCard({ check, childId, birthDate, pending }: { check: GrowthCheckRecord; childId: string; birthDate: string; pending: boolean }): React.JSX.Element {
  const corrected = check.correctedAgeDays !== check.ageDays;

  return (
    <li className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{formatCalendarDate(check.measuredOn)}</p>
          <p className="text-sm text-muted">
            {describeScheduleAge(check.ageDays)}
            {corrected ? `, edad corregida ${describeScheduleAge(check.correctedAgeDays)}` : ''}. {check.weightKg} kg, {check.lengthCm} cm ({POSITION_LABEL[check.position].toLowerCase()})
            {check.headCircumferenceCm === null ? '' : `, perímetro cefálico ${check.headCircumferenceCm} cm`}.
          </p>
        </div>
        {pending ? null : (
          <CorrectRecord
            childId={childId}
            recordType="GROWTH_CHECK"
            recordId={check.id}
            birthDate={birthDate}
            canCorrectDirectly={check.canCorrectDirectly}
            defaults={{
              measuredOn: check.measuredOn,
              weightKg: check.weightKg,
              lengthCm: check.lengthCm,
              position: check.position,
              headCircumferenceCm: check.headCircumferenceCm ?? undefined,
            }}
          />
        )}
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Indicator label="Peso para la edad" z={check.zWeightForAge} classification={check.weightForAge} />
        <Indicator label="Talla para la edad" z={check.zLengthForAge} classification={check.lengthForAge} />
        <Indicator label="Peso para la talla" z={check.zWeightForLength} classification={check.weightForLength} />
        {check.headCircumferenceCm === null ? null : <Indicator label="Perímetro cefálico" z={check.zHeadForAge} classification={check.headForAge} />}
      </dl>
      <RecordFooter record={check} pending={pending} />
    </li>
  );
}

export function GrowthSection({ childId, birthDate, ageDays, checks, supplies, bands, pendingIds }: GrowthSectionProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <CareGrid childId={childId} birthDate={birthDate} ageDays={ageDays} checks={checks} supplies={supplies} pendingIds={pendingIds} />

      <section aria-labelledby="curves" className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="curves" className="text-lg font-semibold">
              Curvas de crecimiento
            </h2>
            <p className="text-sm text-muted">Patrones de la OMS 2006, con la edad corregida si nació prematuro. Toca un punto para ver su puntaje Z.</p>
          </div>
          <RecordGrowth childId={childId} birthDate={birthDate} />
        </div>
        <GrowthCurves bands={bands} checks={checks} audience="staff" />
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-4">
        <h2 id="history" className="text-lg font-semibold">
          Detalle de los controles
        </h2>
        {checks.length === 0 ? (
          <EmptyState title="Sin controles">Registra el primer control de peso y talla desde la grilla.</EmptyState>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {checks.map((check) => (
              <CheckCard key={check.id} check={check} childId={childId} birthDate={birthDate} pending={pendingIds.has(check.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
