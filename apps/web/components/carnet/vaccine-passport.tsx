'use client';

import type { CarnetDose } from '@carnet/contracts';
import { Check, Clock, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { SidePanel } from '@/components/side-panel';
import { describeScheduleAge, formatCalendarDate } from '@/lib/labels';

function groupByAge(doses: readonly CarnetDose[]): [number, CarnetDose[]][] {
  const groups = new Map<number, CarnetDose[]>();

  for (const dose of doses) {
    groups.set(dose.recommendedAgeDays, [...(groups.get(dose.recommendedAgeDays) ?? []), dose]);
  }

  return [...groups.entries()].sort(([first], [second]) => first - second);
}

function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').split(/[\s-]+/).filter((word) => word.length > 0);

  return words.length === 1 ? (words[0] ?? '').slice(0, 3).toUpperCase() : words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
}

function Stamp({ dose, index, onOpen }: { dose: CarnetDose; index: number; onOpen: (dose: CarnetDose) => void }): React.JSX.Element {
  const applied = dose.status === 'APPLIED';
  const overdue = dose.status === 'OVERDUE';
  const due = dose.status === 'DUE';

  return (
    <li>
      <button type="button" onClick={() => onOpen(dose)} className="flex w-full flex-col items-center gap-2 rounded-[18px] p-2 text-center transition-colors hover:bg-white/70">
        {applied ? (
          <motion.span
            initial={{ scale: 1.6, opacity: 0, rotate: -18 }}
            whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16, delay: Math.min(index, 8) * 0.07 }}
            className="relative grid size-20 place-items-center rounded-full border-[3px] border-double border-celeste-700 bg-celeste-50 text-celeste-800 shadow-[inset_0_0_0_4px_var(--color-white,#fff)]"
          >
            <span className="font-display text-lg font-bold leading-none">{initials(dose.vaccineName)}</span>
            <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-celeste-700 text-white">
              <Check aria-hidden="true" className="size-4" />
            </span>
          </motion.span>
        ) : (
          <span
            className={`grid size-20 place-items-center rounded-full border-2 border-dashed ${
              overdue ? 'border-warn bg-warn/5 text-warn' : due ? 'border-celeste-500 bg-white text-celeste-700' : 'border-line bg-white/60 text-muted'
            }`}
          >
            {overdue ? <TriangleAlert aria-hidden="true" className="size-6" /> : <Clock aria-hidden="true" className="size-6" />}
          </span>
        )}
        <span className="text-sm font-semibold leading-tight">{dose.vaccineName}</span>
        <span className="text-xs text-muted">
          Dosis {dose.doseNumber}.{' '}
          {applied && dose.appliedOn !== null
            ? formatCalendarDate(dose.appliedOn)
            : overdue
              ? 'Atrasada'
              : due
                ? 'Ya le toca'
                : formatCalendarDate(dose.recommendedDate)}
        </span>
      </button>
    </li>
  );
}

function DoseDetail({ dose }: { dose: CarnetDose }): React.JSX.Element {
  if (dose.status === 'APPLIED') {
    return (
      <dl className="grid gap-4">
        <div>
          <dt className="text-sm text-muted">Previene</dt>
          <dd className="font-semibold">{dose.prevents}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Aplicada el</dt>
          <dd className="font-semibold">{dose.appliedOn === null ? 'Sin fecha' : formatCalendarDate(dose.appliedOn)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Establecimiento</dt>
          <dd className="font-semibold">{dose.facilityName ?? 'Sin registrar'}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Lote</dt>
          <dd className="font-mono font-semibold">{dose.lot ?? 'Sin registrar'}</dd>
        </div>
      </dl>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>
        <span className="text-sm text-muted">Previene: </span>
        <span className="font-semibold">{dose.prevents}</span>
      </p>
      {dose.status === 'OVERDUE' ? (
        <p className="rounded-(--radius-control) border border-warn/40 bg-warn/5 px-4 py-3">
          Ya pasó la edad recomendada para esta dosis. Acude a tu establecimiento de salud: el personal te dirá si todavía puede recibirla.
        </p>
      ) : dose.status === 'DUE' ? (
        <p className="rounded-(--radius-control) border border-celeste-200 bg-celeste-50 px-4 py-3">
          Le corresponde desde el {formatCalendarDate(dose.recommendedDate)}. Acércate a tu establecimiento con el DNI del niño.
        </p>
      ) : (
        <p className="rounded-(--radius-control) border border-line bg-canvas px-4 py-3">Le corresponderá desde el {formatCalendarDate(dose.recommendedDate)}.</p>
      )}
    </div>
  );
}

export function VaccinePassport({ doses }: { doses: readonly CarnetDose[] }): React.JSX.Element {
  const [selected, setSelected] = useState<CarnetDose | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const groups = groupByAge(doses);
  const offsets = groups.map((_, position) => groups.slice(0, position).reduce((total, [, group]) => total + group.length, 0));

  return (
    <>
      <div className="flex flex-col gap-5">
        {groups.map(([ageDays, group], position) => (
          <section key={ageDays} aria-label={describeScheduleAge(ageDays)} className="rounded-[24px] border border-celeste-200 bg-white/80 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-celeste-700">{describeScheduleAge(ageDays)}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {group.map((dose, order) => (
                <Stamp key={dose.scheduledDoseId} dose={dose} index={(offsets[position] ?? 0) + order} onOpen={setSelected} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <SidePanel open={selected !== null} title={selected === null ? '' : `${selected.vaccineName}, dosis ${selected.doseNumber}`} onClose={close}>
        {selected === null ? null : <DoseDetail dose={selected} />}
      </SidePanel>
    </>
  );
}
