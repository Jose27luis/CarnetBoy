import { ageInCompletedMonths, ageInDays, correctedAgeDays } from './age';
import { parseCalendarDate } from './calendar-date';

describe('ageInDays', () => {
  it('cuenta cero días el mismo día del nacimiento', () => {
    expect(ageInDays(parseCalendarDate('2026-03-15'), parseCalendarDate('2026-03-15'))).toBe(0);
  });

  it('cuenta los días a través de un año bisiesto', () => {
    expect(ageInDays(parseCalendarDate('2024-02-28'), parseCalendarDate('2024-03-01'))).toBe(2);
    expect(ageInDays(parseCalendarDate('2024-01-01'), parseCalendarDate('2025-01-01'))).toBe(366);
  });

  it('rechaza una fecha anterior al nacimiento', () => {
    expect(() => ageInDays(parseCalendarDate('2026-03-15'), parseCalendarDate('2026-03-14'))).toThrow(RangeError);
  });
});

describe('correctedAgeDays', () => {
  const birth = parseCalendarDate('2026-01-01');

  it('descuenta las semanas que faltaron para las 40 en un prematuro', () => {
    expect(correctedAgeDays(birth, 32, parseCalendarDate('2026-04-01'))).toBe(90 - 56);
  });

  it('no corrige a un nacido a término ni sin semanas registradas', () => {
    expect(correctedAgeDays(birth, 39, parseCalendarDate('2026-04-01'))).toBe(90);
    expect(correctedAgeDays(birth, null, parseCalendarDate('2026-04-01'))).toBe(90);
  });

  it('deja de corregir a los 24 meses', () => {
    expect(correctedAgeDays(birth, 30, parseCalendarDate('2028-01-02'))).toBe(731);
  });
});

describe('ageInCompletedMonths', () => {
  it('cuenta meses cumplidos', () => {
    expect(ageInCompletedMonths(parseCalendarDate('2025-03-15'), parseCalendarDate('2026-03-14'))).toBe(11);
    expect(ageInCompletedMonths(parseCalendarDate('2025-03-15'), parseCalendarDate('2026-03-15'))).toBe(12);
  });
});

describe('parseCalendarDate', () => {
  it.each(['2026-3-15', '15/03/2026', '2026-02-30', '2025-02-29'])('rechaza %p', (value) => {
    expect(() => parseCalendarDate(value)).toThrow(RangeError);
  });
});
