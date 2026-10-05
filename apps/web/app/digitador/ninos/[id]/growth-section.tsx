import type { GrowthCheckRecord } from '@carnet/contracts';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { describeScheduleAge, formatCalendarDate, GROWTH_CLASS_LABEL, growthClassTone, POSITION_LABEL } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { CorrectRecord, RecordGrowth } from './clinical-forms';
import { RecordFooter } from './record-footer';

interface GrowthSectionProps {
  childId: string;
  birthDate: string;
  checks: readonly GrowthCheckRecord[];
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

export function GrowthSection({ childId, birthDate, checks, pendingIds }: GrowthSectionProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Patrones de crecimiento de la OMS 2006. Del control más reciente al más antiguo.</p>
        <RecordGrowth childId={childId} birthDate={birthDate} />
      </div>
      {checks.length === 0 ? (
        <EmptyState title="Sin controles">Registra el primer control de peso y talla.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {checks.map((check) => (
            <CheckCard key={check.id} check={check} childId={childId} birthDate={birthDate} pending={pendingIds.has(check.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
