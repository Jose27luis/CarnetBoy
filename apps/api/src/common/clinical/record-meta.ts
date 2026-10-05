import { type CalendarDate, parseCalendarDate } from '@carnet/clinical';
import { DIRECT_CORRECTION_WINDOW_HOURS, type RecordMeta } from '@carnet/contracts';

export const RECORD_META_INCLUDE = {
  recordedBy: { select: { fullName: true } },
  facility: { select: { name: true } },
} as const;

export interface RecordMetaRow {
  id: string;
  recordedAt: Date;
  recordedById: string;
  version: number;
  correctionReason: string | null;
  recordedBy: { fullName: string };
  facility: { name: string };
}

const WINDOW_MS = DIRECT_CORRECTION_WINDOW_HOURS * 60 * 60 * 1000;

export function canCorrectDirectly(recordedById: string, recordedAt: Date, viewerId: string, now: Date): boolean {
  return recordedById === viewerId && now.getTime() - recordedAt.getTime() < WINDOW_MS;
}

export function toRecordMeta(row: RecordMetaRow, viewerId: string, now: Date): RecordMeta {
  return {
    id: row.id,
    recordedAt: row.recordedAt.toISOString(),
    recordedByName: row.recordedBy.fullName,
    facilityName: row.facility.name,
    version: row.version,
    correctionReason: row.correctionReason,
    canCorrectDirectly: canCorrectDirectly(row.recordedById, row.recordedAt, viewerId, now),
  };
}

export function dateColumn(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayInLima(now: Date): CalendarDate {
  return parseCalendarDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now));
}
