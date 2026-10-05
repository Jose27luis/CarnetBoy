import { parseCalendarDate } from './calendar-date';
import { dateAtAge, doseStatus, isWithinDoseAge } from './immunization';

const birth = parseCalendarDate('2026-01-01');
const twoMonths = { recommendedAgeDays: 60, maxAgeDays: 365 };

describe('estado de una dosis', () => {
  it('es futura antes de la edad recomendada', () => {
    expect(doseStatus(twoMonths, birth, false, parseCalendarDate('2026-02-01'))).toBe('FUTURE');
  });

  it('está pendiente entre la edad recomendada y la máxima', () => {
    expect(doseStatus(twoMonths, birth, false, parseCalendarDate('2026-03-02'))).toBe('DUE');
  });

  it('vence después de la edad máxima', () => {
    expect(doseStatus(twoMonths, birth, false, parseCalendarDate('2027-01-02'))).toBe('OVERDUE');
  });

  it('una dosis aplicada siempre figura como aplicada', () => {
    expect(doseStatus(twoMonths, birth, true, parseCalendarDate('2027-06-01'))).toBe('APPLIED');
  });
});

describe('fechas y rangos de edad', () => {
  it('calcula la fecha recomendada', () => {
    expect(dateAtAge(birth, 60)).toBe('2026-03-02');
  });

  it('detecta si la edad está dentro del rango de la dosis', () => {
    expect(isWithinDoseAge(twoMonths, 59)).toBe(false);
    expect(isWithinDoseAge(twoMonths, 60)).toBe(true);
    expect(isWithinDoseAge(twoMonths, 366)).toBe(false);
  });
});
