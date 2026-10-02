import { ageInDays } from './age';
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

describe('parseCalendarDate', () => {
  it.each(['2026-3-15', '15/03/2026', '2026-02-30', '2025-02-29'])('rechaza %p', (value) => {
    expect(() => parseCalendarDate(value)).toThrow(RangeError);
  });
});
