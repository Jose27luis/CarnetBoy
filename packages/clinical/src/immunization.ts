import { type CalendarDate, calendarDateToUtcMilliseconds, daysBetween } from './calendar-date';

export type DoseStatus = 'FUTURE' | 'DUE' | 'OVERDUE' | 'APPLIED';

export interface ScheduleDose {
  recommendedAgeDays: number;
  maxAgeDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function doseStatus(dose: ScheduleDose, birthDate: CalendarDate, applied: boolean, today: CalendarDate): DoseStatus {
  if (applied) {
    return 'APPLIED';
  }

  const age = daysBetween(birthDate, today);

  if (age < dose.recommendedAgeDays) {
    return 'FUTURE';
  }

  return age > dose.maxAgeDays ? 'OVERDUE' : 'DUE';
}

export function dateAtAge(birthDate: CalendarDate, ageDays: number): string {
  return new Date(calendarDateToUtcMilliseconds(birthDate) + ageDays * DAY_MS).toISOString().slice(0, 10);
}

export function isWithinDoseAge(dose: ScheduleDose, ageDays: number): boolean {
  return ageDays >= dose.recommendedAgeDays && ageDays <= dose.maxAgeDays;
}
