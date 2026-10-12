import type { Achievement, CarnetDose, CarnetGrowthCheck, CarnetHemoglobinTest } from '@carnet/contracts';

function ageGroupLabel(days: number): string {
  if (days === 0) {
    return 'del recién nacido';
  }

  const months = Math.round(days / 30.4375);

  if (months < 24) {
    return months === 1 ? 'del primer mes' : `de los ${months} meses`;
  }

  const years = Math.round(days / 365.25);

  return `de los ${years} años`;
}

function latest(dates: readonly string[]): string {
  return [...dates].sort().at(-1) ?? '';
}

function vaccineAchievements(doses: readonly CarnetDose[]): Achievement[] {
  const groups = new Map<number, CarnetDose[]>();

  for (const dose of doses) {
    groups.set(dose.recommendedAgeDays, [...(groups.get(dose.recommendedAgeDays) ?? []), dose]);
  }

  return [...groups.entries()].flatMap(([days, group]) => {
    const appliedOn = group.map((dose) => dose.appliedOn);

    if (appliedOn.some((date) => date === null)) {
      return [];
    }

    const label = ageGroupLabel(days);

    return [
      {
        key: `vaccines-${days}`,
        title: `Vacunas ${label} completas`,
        description: group.length === 1 ? `Recibió la dosis ${label}.` : `Recibió las ${group.length} dosis ${label}.`,
        achievedOn: latest(appliedOn.filter((date): date is string => date !== null)),
      },
    ];
  });
}

export function achievementsFor(doses: readonly CarnetDose[], growth: readonly CarnetGrowthCheck[], hemoglobin: readonly CarnetHemoglobinTest[]): Achievement[] {
  const achievements = vaccineAchievements(doses);
  const firstCheck = [...growth].sort((first, second) => first.measuredOn.localeCompare(second.measuredOn))[0];
  const lastTest = [...hemoglobin].sort((first, second) => second.testedOn.localeCompare(first.testedOn))[0];

  if (firstCheck !== undefined) {
    achievements.push({
      key: 'first-growth-check',
      title: 'Primer control de crecimiento',
      description: 'Ya tiene su primera medida de peso y talla en el carnet.',
      achievedOn: firstCheck.measuredOn,
    });
  }

  if (lastTest?.classification === 'NONE') {
    achievements.push({
      key: 'hemoglobin-normal',
      title: 'Hemoglobina en rango normal',
      description: 'Su último dosaje salió sin anemia.',
      achievedOn: lastTest.testedOn,
    });
  }

  return achievements.sort((first, second) => second.achievedOn.localeCompare(first.achievedOn));
}
