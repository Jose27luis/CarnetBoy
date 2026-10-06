import { ageInCompletedMonths } from './age';
import { type CalendarDate, calendarDateToUtcMilliseconds, parseCalendarDate } from './calendar-date';

const DAY_MS = 86_400_000;

export type IntervalAppointmentType = 'GROWTH_CHECK' | 'VACCINATION' | 'HEMOGLOBIN_TEST';

export interface IntervalRow {
  appointmentType: IntervalAppointmentType;
  minAgeMonths: number;
  maxAgeMonths: number;
  intervalDays: number;
}

export interface ProposedDate {
  suggestedOn: CalendarDate;
  intervalDays: number;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return parseCalendarDate(new Date(calendarDateToUtcMilliseconds(date) + days * DAY_MS).toISOString().slice(0, 10));
}

export function laterOf(first: CalendarDate, second: CalendarDate): CalendarDate {
  return first > second ? first : second;
}

export function intervalFor(intervals: readonly IntervalRow[], type: IntervalAppointmentType, ageMonths: number): number | null {
  const row = intervals.find((item) => item.appointmentType === type && ageMonths >= item.minAgeMonths && ageMonths <= item.maxAgeMonths);

  return row?.intervalDays ?? null;
}

export function proposeAfter(
  birthDate: CalendarDate,
  lastDate: CalendarDate | null,
  type: IntervalAppointmentType,
  intervals: readonly IntervalRow[],
  today: CalendarDate,
): ProposedDate | null {
  const from = lastDate ?? birthDate;
  const intervalDays = intervalFor(intervals, type, ageInCompletedMonths(birthDate, from));

  return intervalDays === null ? null : { suggestedOn: laterOf(addDays(from, intervalDays), today), intervalDays };
}
