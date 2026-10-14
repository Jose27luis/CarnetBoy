'use client';

import type { GrowthCheckRecord, IronSupplyRecord } from '@carnet/contracts';
import { ChevronDown, Pill } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Badge } from '@/components/badge';
import { addDaysTo, CARE_MILESTONES, nearestMilestone } from '@/lib/care-milestones';
import { formatCalendarDate, GROWTH_CLASS_LABEL, growthClassTone, IRON_PRODUCT_LABEL } from '@/lib/labels';
import { CorrectRecord, RecordGrowth } from './clinical-forms';

interface CareGridProps {
  childId: string;
  birthDate: string;
  ageDays: number;
  checks: readonly GrowthCheckRecord[];
  supplies: readonly IronSupplyRecord[];
  pendingIds: ReadonlySet<string>;
}

interface Row {
  index: number;
  label: string;
  date: string;
  check: GrowthCheckRecord | undefined;
  previous: GrowthCheckRecord | undefined;
  supplies: IronSupplyRecord[];
  state: 'done' | 'current' | 'missed' | 'future';
}

const VISIBLE_FUTURE = 2;
const MONTH_DAYS = 30.4375;
const TH = 'px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-white/90';

function daysFrom(birthDate: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${birthDate}T00:00:00Z`)) / 86_400_000);
}

function gain(check: GrowthCheckRecord | undefined, previous: GrowthCheckRecord | undefined): { weight: string; length: string } | null {
  if (check === undefined || previous === undefined) {
    return null;
  }

  const monthsBetween = (check.ageDays - previous.ageDays) / MONTH_DAYS;

  if (monthsBetween <= 0) {
    return null;
  }

  const weight = Math.round(((Number(check.weightKg) - Number(previous.weightKg)) * 1000) / monthsBetween);
  const length = Math.round(((Number(check.lengthCm) - Number(previous.lengthCm)) / monthsBetween) * 10) / 10;

  return { weight: `${weight > 0 ? '+' : ''}${weight} g`, length: `${length > 0 ? '+' : ''}${length.toLocaleString('es-PE')} cm` };
}

function buildRows({ birthDate, ageDays, checks, supplies }: CareGridProps): Row[] {
  const byMilestone = new Map<number, GrowthCheckRecord>();
  const ordered = [...checks].sort((first, second) => first.ageDays - second.ageDays);

  for (const check of ordered) {
    byMilestone.set(nearestMilestone(check.ageDays), check);
  }

  const suppliesBy = new Map<number, IronSupplyRecord[]>();

  for (const supply of supplies) {
    const index = nearestMilestone(daysFrom(birthDate, supply.suppliedOn));
    suppliesBy.set(index, [...(suppliesBy.get(index) ?? []), supply]);
  }

  const current = nearestMilestone(ageDays);
  let previous: GrowthCheckRecord | undefined;

  return CARE_MILESTONES.map((milestone, index) => {
    const check = byMilestone.get(index);
    const row: Row = {
      index,
      label: milestone.label,
      date: addDaysTo(birthDate, milestone.days),
      check,
      previous,
      supplies: suppliesBy.get(index) ?? [],
      state: check !== undefined ? 'done' : index === current ? 'current' : index < current ? 'missed' : 'future',
    };

    if (check !== undefined) {
      previous = check;
    }

    return row;
  });
}

const ROW_TONE: Record<Row['state'], string> = {
  done: 'bg-white',
  current: 'bg-sun-50 ring-2 ring-inset ring-sun-500/50',
  missed: 'bg-white',
  future: 'bg-canvas/70 text-muted',
};

export function CareGrid(props: CareGridProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const rows = buildRows(props);
  const current = nearestMilestone(props.ageDays);
  const visible = expanded ? rows : rows.filter((row) => row.index <= current + VISIBLE_FUTURE);
  const done = rows.filter((row) => row.state === 'done').length;
  const due = rows.filter((row) => row.index <= current).length;

  return (
    <section aria-labelledby="care-grid" className="overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-[0_18px_40px_-30px_rgba(11,79,111,0.45)]">
      <header className="flex flex-wrap items-end justify-between gap-3 bg-linear-to-r from-celeste-50 via-white to-mint-50 px-5 py-4">
        <div>
          <h2 id="care-grid" className="text-lg font-semibold">
            Paquete de atención integral
          </h2>
          <p className="text-sm text-muted">Un control por edad, como en el carné. Toca Registrar en la fila que corresponda.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            <span className="font-display text-xl font-semibold text-ink">{done}</span> de {due} controles a la fecha
          </span>
          <span className="h-2 w-28 overflow-hidden rounded-full bg-canvas">
            <motion.span
              className="block h-full rounded-full bg-linear-to-r from-mint-700 to-mint-500"
              initial={{ width: 0 }}
              animate={{ width: `${due === 0 ? 0 : Math.min(100, (done / due) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-linear-to-r from-celeste-800 to-celeste-600">
            <tr>
              <th className={TH}>Edad</th>
              <th className={TH}>Fecha</th>
              <th className={TH}>Peso</th>
              <th className={TH}>Talla</th>
              <th className={TH} title="Ganancia de peso por mes desde el control anterior">GP / mes</th>
              <th className={TH} title="Ganancia de talla por mes desde el control anterior">GT / mes</th>
              <th className={TH}>Perímetro</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Hierro</th>
              <th className={`${TH} text-right`}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, position) => {
              const growth = gain(row.check, row.previous);
              const classification = row.check?.weightForLength ?? row.check?.weightForAge ?? null;

              return (
                <motion.tr
                  key={row.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(position, 14) * 0.025, duration: 0.3 }}
                  className={`border-b border-line/60 ${ROW_TONE[row.state]}`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 font-display text-xs font-semibold ${
                        row.state === 'done' ? 'bg-celeste-100 text-celeste-900' : row.state === 'current' ? 'bg-sun-500 text-white' : 'bg-canvas text-muted'
                      }`}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{row.check === undefined ? <span className="text-muted">{formatCalendarDate(row.date)}</span> : formatCalendarDate(row.check.measuredOn)}</td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">{row.check === undefined ? '' : `${Number(row.check.weightKg).toLocaleString('es-PE')} kg`}</td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">{row.check === undefined ? '' : `${row.check.lengthCm} cm`}</td>
                  <td className="px-3 py-2.5 tabular-nums">{growth?.weight ?? ''}</td>
                  <td className="px-3 py-2.5 tabular-nums">{growth?.length ?? ''}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row.check?.headCircumferenceCm === null || row.check === undefined ? '' : `${row.check.headCircumferenceCm} cm`}</td>
                  <td className="px-3 py-2.5">
                    {row.check === undefined ? (
                      row.state === 'missed' ? (
                        <Badge tone="neutral">Sin control</Badge>
                      ) : row.state === 'current' ? (
                        <Badge tone="warn">Le toca</Badge>
                      ) : null
                    ) : (
                      <Badge tone={growthClassTone(classification)}>{GROWTH_CLASS_LABEL[classification ?? ''] ?? 'Sin referencia'}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.supplies.map((supply) => (
                      <span key={supply.id} className="mr-1 inline-flex items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coral-700">
                        <Pill aria-hidden="true" className="size-3" />
                        {IRON_PRODUCT_LABEL[supply.product]}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.check !== undefined ? (
                      props.pendingIds.has(row.check.id) ? (
                        <Badge tone="warn">Corrección pendiente</Badge>
                      ) : (
                        <CorrectRecord
                          childId={props.childId}
                          recordType="GROWTH_CHECK"
                          recordId={row.check.id}
                          birthDate={props.birthDate}
                          canCorrectDirectly={row.check.canCorrectDirectly}
                          defaults={{
                            measuredOn: row.check.measuredOn,
                            weightKg: row.check.weightKg,
                            lengthCm: row.check.lengthCm,
                            position: row.check.position,
                            headCircumferenceCm: row.check.headCircumferenceCm ?? undefined,
                          }}
                        />
                      )
                    ) : row.state === 'future' ? null : (
                      <RecordGrowth
                        childId={props.childId}
                        birthDate={props.birthDate}
                        measuredOn={row.state === 'current' ? undefined : row.date}
                        compact
                        title={`Control de ${row.label}`}
                      />
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-line/60 py-3 text-sm font-semibold text-celeste-700 hover:bg-celeste-50"
      >
        {expanded ? 'Mostrar hasta la edad actual' : 'Ver todas las edades hasta los 5 años'}
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </section>
  );
}
