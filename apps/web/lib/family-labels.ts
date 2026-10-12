import type { AnemiaClass, AppointmentType } from '@carnet/contracts';

export function ageInMonthsAndDays(birthDate: string, today: string): string {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = birthDate.split('-').map(Number);
  const [year = 0, month = 1, day = 1] = today.split('-').map(Number);
  let months = (year - birthYear) * 12 + (month - birthMonth);

  if (day < birthDay) {
    months -= 1;
  }

  const anchor = Date.UTC(birthYear, birthMonth - 1 + months, birthDay);
  const days = Math.max(0, Math.round((Date.UTC(year, month - 1, day) - anchor) / 86_400_000));

  if (months <= 0) {
    return days === 1 ? '1 día' : `${days} días`;
  }

  if (months >= 24) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const yearsText = years === 1 ? '1 año' : `${years} años`;

    return rest === 0 ? yearsText : `${yearsText} y ${rest} ${rest === 1 ? 'mes' : 'meses'}`;
  }

  const monthsText = months === 1 ? '1 mes' : `${months} meses`;

  return days === 0 ? monthsText : `${monthsText} y ${days} ${days === 1 ? 'día' : 'días'}`;
}

export const FAMILY_GROWTH_TEXT: Record<string, string> = {
  NORMAL: 'Dentro de lo esperado',
  UNDERWEIGHT: 'Peso bajo para su edad',
  SEVERELY_UNDERWEIGHT: 'Peso muy bajo para su edad',
  STUNTED: 'Talla baja para su edad',
  SEVERELY_STUNTED: 'Talla muy baja para su edad',
  WASTED: 'Peso bajo para su talla',
  SEVERELY_WASTED: 'Peso muy bajo para su talla',
  OVERWEIGHT: 'Peso alto para su talla',
  OBESE: 'Peso muy alto para su talla',
  MICROCEPHALY: 'Cabeza más pequeña de lo esperado',
  MACROCEPHALY: 'Cabeza más grande de lo esperado',
};

export function familyGrowthText(value: string | null): string {
  return value === null ? 'Sin referencia para su edad' : (FAMILY_GROWTH_TEXT[value] ?? value);
}

export const FAMILY_ANEMIA_TEXT: Record<AnemiaClass, string> = {
  NONE: 'Sin anemia',
  MILD: 'Anemia leve',
  MODERATE: 'Anemia moderada',
  SEVERE: 'Anemia severa',
  UNCLASSIFIED: 'Sin clasificación por su edad',
};

export const FAMILY_APPOINTMENT_TEXT: Record<AppointmentType, string> = {
  GROWTH_CHECK: 'Control de crecimiento',
  VACCINATION: 'Vacunación',
  HEMOGLOBIN_TEST: 'Dosaje de hemoglobina',
};
