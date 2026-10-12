import type { GuardianCarnet } from '@carnet/contracts';
import type { Metadata } from 'next';
import { Timeline, type TimelineItem } from '@/components/carnet/timeline';
import { FAMILY_ANEMIA_TEXT, FAMILY_APPOINTMENT_TEXT, familyGrowthText } from '@/lib/family-labels';
import { loadCarnet } from '@/lib/guardian';
import { IRON_PRODUCT_LABEL, IRON_PURPOSE_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'Historia' };

interface HistoryPageProps {
  params: Promise<{ id: string }>;
}

function timelineOf(carnet: GuardianCarnet): TimelineItem[] {
  const items: TimelineItem[] = [
    ...carnet.appointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      kind: 'APPOINTMENT' as const,
      date: appointment.scheduledOn,
      title: FAMILY_APPOINTMENT_TEXT[appointment.type],
      detail: appointment.facilityName,
      upcoming: true,
    })),
    ...carnet.doses.flatMap((dose) =>
      dose.appliedOn === null
        ? []
        : [
            {
              id: `dose-${dose.scheduledDoseId}`,
              kind: 'VACCINE' as const,
              date: dose.appliedOn,
              title: `${dose.vaccineName}, dosis ${dose.doseNumber}`,
              detail: `${dose.prevents}. ${dose.facilityName ?? ''}`.trim(),
              upcoming: false,
            },
          ],
    ),
    ...carnet.growth.map((check) => ({
      id: `growth-${check.id}`,
      kind: 'GROWTH' as const,
      date: check.measuredOn,
      title: `Control: ${Number(check.weightKg).toLocaleString('es-PE', { maximumFractionDigits: 2 })} kg y ${check.lengthCm} cm`,
      detail: `${familyGrowthText(check.weightForLength ?? check.weightForAge)}. ${check.facilityName}`,
      upcoming: false,
    })),
    ...carnet.hemoglobin.map((test) => ({
      id: `hemoglobin-${test.id}`,
      kind: 'HEMOGLOBIN' as const,
      date: test.testedOn,
      title: `Hemoglobina: ${test.adjusted} g/dL`,
      detail: `${FAMILY_ANEMIA_TEXT[test.classification]}. ${test.facilityName}`,
      upcoming: false,
    })),
    ...carnet.iron.map((supply) => ({
      id: `iron-${supply.id}`,
      kind: 'IRON' as const,
      date: supply.suppliedOn,
      title: `Hierro en ${IRON_PRODUCT_LABEL[supply.product].toLowerCase()} (${IRON_PURPOSE_LABEL[supply.purpose].toLowerCase()})`,
      detail: supply.doseInstructions,
      upcoming: false,
    })),
  ];

  return items.sort((first, second) => second.date.localeCompare(first.date));
}

export default async function HistoryPage({ params }: HistoryPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const carnet = await loadCarnet(id);

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Historia</h2>
        <p className="text-muted">Todas sus atenciones, de la más reciente a la primera.</p>
      </div>
      <Timeline items={timelineOf(carnet)} />
    </>
  );
}
