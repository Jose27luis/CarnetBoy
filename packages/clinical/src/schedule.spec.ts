import { parseCalendarDate } from './calendar-date';
import { addDays, intervalFor, type IntervalRow, proposeAfter } from './schedule';

const INTERVALS: IntervalRow[] = [
  { appointmentType: 'GROWTH_CHECK', minAgeMonths: 0, maxAgeMonths: 11, intervalDays: 30 },
  { appointmentType: 'GROWTH_CHECK', minAgeMonths: 12, maxAgeMonths: 23, intervalDays: 60 },
  { appointmentType: 'HEMOGLOBIN_TEST', minAgeMonths: 6, maxAgeMonths: 23, intervalDays: 90 },
];

const birth = parseCalendarDate('2026-01-15');

describe('propuesta de citas', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays(parseCalendarDate('2026-12-20'), 15)).toBe('2027-01-04');
  });

  it('elige el intervalo según el tipo y la edad en meses', () => {
    expect(intervalFor(INTERVALS, 'GROWTH_CHECK', 3)).toBe(30);
    expect(intervalFor(INTERVALS, 'GROWTH_CHECK', 12)).toBe(60);
    expect(intervalFor(INTERVALS, 'HEMOGLOBIN_TEST', 3)).toBeNull();
  });

  it('propone desde la última atención y nunca antes de hoy', () => {
    const today = parseCalendarDate('2026-04-01');

    expect(proposeAfter(birth, parseCalendarDate('2026-03-20'), 'GROWTH_CHECK', INTERVALS, today)?.suggestedOn).toBe('2026-04-19');
    expect(proposeAfter(birth, parseCalendarDate('2026-02-01'), 'GROWTH_CHECK', INTERVALS, today)?.suggestedOn).toBe('2026-04-01');
  });

  it('usa el nacimiento cuando no hay atenciones y no propone sin intervalo', () => {
    const today = parseCalendarDate('2026-01-20');

    expect(proposeAfter(birth, null, 'GROWTH_CHECK', INTERVALS, today)?.suggestedOn).toBe('2026-02-14');
    expect(proposeAfter(birth, null, 'HEMOGLOBIN_TEST', INTERVALS, today)).toBeNull();
  });
});
