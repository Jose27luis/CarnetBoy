import { type CalendarDate, daysBetween, parseCalendarDate } from '@carnet/clinical';
import { DomainError } from '../errors/domain-error';
import { todayInLima } from './record-meta';

export function validRecordDate(field: string, value: string, birthDate: CalendarDate, now: Date): CalendarDate {
  let date: CalendarDate;

  try {
    date = parseCalendarDate(value);
  } catch {
    throw DomainError.validation({ [field]: ['La fecha no existe en el calendario.'] });
  }

  if (date > todayInLima(now)) {
    throw DomainError.validation({ [field]: ['La fecha no puede ser futura.'] });
  }

  if (daysBetween(birthDate, date) < 0) {
    throw DomainError.validation({ [field]: ['La fecha no puede ser anterior al nacimiento.'] });
  }

  return date;
}
