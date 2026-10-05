import { type CalendarDate, daysBetween } from './calendar-date';

export const TERM_WEEKS = 40;
export const PRETERM_BELOW_WEEKS = 37;
export const CORRECTED_AGE_LIMIT_DAYS = 731;
const DAYS_PER_MONTH = 30.4375;

export function ageInDays(birthDate: CalendarDate, at: CalendarDate): number {
  const days = daysBetween(birthDate, at);

  if (days < 0) {
    throw new RangeError(`La fecha ${at} es anterior al nacimiento (${birthDate}).`);
  }

  return days;
}

export function correctedAgeDays(birthDate: CalendarDate, gestationalWeeks: number | null, at: CalendarDate): number {
  const chronological = ageInDays(birthDate, at);

  if (gestationalWeeks === null || gestationalWeeks >= PRETERM_BELOW_WEEKS || chronological >= CORRECTED_AGE_LIMIT_DAYS) {
    return chronological;
  }

  return Math.max(0, chronological - (TERM_WEEKS - gestationalWeeks) * 7);
}

export function ageInCompletedMonths(birthDate: CalendarDate, at: CalendarDate): number {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = birthDate.split('-').map(Number);
  const [year = 0, month = 1, day = 1] = at.split('-').map(Number);

  return Math.max(0, (year - birthYear) * 12 + (month - birthMonth) - (day < birthDay ? 1 : 0));
}

export function approximateMonths(days: number): number {
  return Math.floor(days / DAYS_PER_MONTH);
}
