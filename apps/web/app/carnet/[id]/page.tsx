import type { Metadata } from 'next';
import Link from 'next/link';
import { AchievementList } from '@/components/carnet/achievement-list';
import { NextStepCard } from '@/components/carnet/next-step-card';
import { ProgressRing } from '@/components/carnet/progress-ring';
import { FAMILY_ANEMIA_TEXT, FAMILY_APPOINTMENT_TEXT, familyGrowthText } from '@/lib/family-labels';
import { loadCarnet } from '@/lib/guardian';
import { formatCalendarDate } from '@/lib/labels';

export const metadata: Metadata = { title: 'Carnet' };

interface ChildHomeProps {
  params: Promise<{ id: string }>;
}

const TILE = 'flex flex-col gap-1 rounded-[20px] border border-celeste-200 bg-white p-4 transition-colors hover:border-celeste-500';

export default async function ChildHomePage({ params }: ChildHomeProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const carnet = await loadCarnet(id);
  const child = carnet.child;
  const reached = child.dosesApplied + child.dosesDue + child.dosesOverdue;
  const lastCheck = carnet.growth[0];
  const lastTest = carnet.hemoglobin[0];
  const base = `/carnet/${child.id}`;

  return (
    <>
      <NextStepCard step={carnet.nextStep} childName={child.givenNames.split(' ')[0] ?? child.givenNames} />

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-2">
        <Link href={`${base}/vacunas`} className={`${TILE} flex-row items-center gap-4 sm:col-span-2`}>
          <ProgressRing done={child.dosesApplied} total={reached} size={104} label="al día" />
          <div>
            <p className="font-display text-lg font-semibold">Vacunas</p>
            <p className="text-muted">
              {reached === 0 ? 'Todavía no le toca ninguna vacuna.' : `${child.dosesApplied} de ${reached} dosis que ya le tocaban.`}
            </p>
            {carnet.scheduleNorm === null ? <p className="text-sm text-muted">El esquema de vacunación aún no está publicado.</p> : null}
          </div>
        </Link>
        <Link href={`${base}/crecimiento`} className={TILE}>
          <p className="text-sm text-muted">Último control</p>
          {lastCheck === undefined ? (
            <p className="font-semibold">Sin controles todavía</p>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {Number(lastCheck.weightKg).toLocaleString('es-PE', { maximumFractionDigits: 2 })} kg · {lastCheck.lengthCm} cm
              </p>
              <p className="text-sm">{familyGrowthText(lastCheck.weightForLength ?? lastCheck.weightForAge)}</p>
              <p className="text-xs text-muted">{formatCalendarDate(lastCheck.measuredOn)}</p>
            </>
          )}
        </Link>
        <Link href={`${base}/hemoglobina`} className={TILE}>
          <p className="text-sm text-muted">Última hemoglobina</p>
          {lastTest === undefined ? (
            <p className="font-semibold">Sin dosajes todavía</p>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold tabular-nums">{lastTest.adjusted} g/dL</p>
              <p className="text-sm">{FAMILY_ANEMIA_TEXT[lastTest.classification]}</p>
              <p className="text-xs text-muted">{formatCalendarDate(lastTest.testedOn)}</p>
            </>
          )}
        </Link>
      </section>

      {carnet.appointments.length > 1 ? (
        <section aria-labelledby="appointments" className="flex flex-col gap-3">
          <h2 id="appointments" className="text-lg font-semibold">
            Otras citas
          </h2>
          <ul className="flex flex-col gap-2">
            {carnet.appointments.slice(1).map((appointment) => (
              <li key={appointment.id} className="rounded-[16px] border border-celeste-200 bg-white px-4 py-3">
                <p className="font-semibold">{FAMILY_APPOINTMENT_TEXT[appointment.type]}</p>
                <p className="text-sm text-muted">
                  {formatCalendarDate(appointment.scheduledOn)} en {appointment.facilityName}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="achievements" className="flex flex-col gap-3">
        <h2 id="achievements" className="text-lg font-semibold">
          Logros
        </h2>
        <AchievementList achievements={carnet.achievements} />
      </section>
    </>
  );
}
