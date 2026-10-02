const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type CalendarDate = string & { readonly __calendarDate: unique symbol };

export function parseCalendarDate(value: string): CalendarDate {
  const match = CALENDAR_DATE_PATTERN.exec(value);

  if (match === null) {
    throw new RangeError(`La fecha "${value}" no tiene el formato AAAA-MM-DD.`);
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    throw new RangeError(`La fecha "${value}" no existe en el calendario.`);
  }

  return value as CalendarDate;
}

export function calendarDateToUtcMilliseconds(date: CalendarDate): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((calendarDateToUtcMilliseconds(to) - calendarDateToUtcMilliseconds(from)) / MILLISECONDS_PER_DAY);
}
