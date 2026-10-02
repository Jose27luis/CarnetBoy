import { type CalendarDate, daysBetween } from './calendar-date';

export function ageInDays(birthDate: CalendarDate, at: CalendarDate): number {
  const days = daysBetween(birthDate, at);

  if (days < 0) {
    throw new RangeError(`La fecha ${at} es anterior al nacimiento (${birthDate}).`);
  }

  return days;
}
