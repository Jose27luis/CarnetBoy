import { parseCalendarDate } from '@carnet/clinical';

export function toDateColumn(value: string): Date {
  return new Date(`${parseCalendarDate(value)}T00:00:00.000Z`);
}

export function fromDateColumn(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}
